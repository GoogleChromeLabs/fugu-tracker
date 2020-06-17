const $ = document.querySelector.bind(document);
const $$ = s => [...document.querySelectorAll(s)];
window.addEventListener('DOMContentLoaded', async e => {


  // ============================================================
  // Fetch and process data

  const data = parseCSV(await (await fetch('issues.csv')).text());

  function parseCSV(csv) {
    const lines = csv
      .split('\n')
      .filter(line => line)
      .map(line => ',' + line)
      .map(line => {
        const matches = [];
        const re = /,"((?:""|[^"])*?)"/g;
        let match;
        while (match = re.exec(line)) matches.push(match[1]);
        return matches;
      });
    const header = lines.shift();
    return lines.map(line =>
      Object.fromEntries(line.map((col, index) => [header[index], col]))
    );
  }

  // Given a field e.g. "M-80, OS-Android, Pri-1, Proj-Fugu, Target-77, Type-Feature"
  // extract the value of a label prefix, e.g. for "M" return "80".
  // Optional suffix can be specified as well (as 3rd argument).
  function getLabel(prefix, labels, opt_suffix) {
    prefix = prefix + '-';
    const suffix = opt_suffix ? '-' + opt_suffix : '';

    labels = labels
      .split(/,\s*/g)
      .filter(label => label.startsWith(prefix))
      .filter(label => label.endsWith(suffix))
      .map(label => label.substring(prefix.length))
      .map(label => label.substring(0, label.length - suffix.length))
      .sort((a, b) => a - b)
      .reverse();
    if (!labels.length)
      return '';
    return labels[0];
  }

  let features = data.map(parsed => {

    const labels = parsed['AllLabels'];
    const row = {
      id: Number(parsed['ID']),
      type: parsed['Type'],
      priority: parsed['Pri'],
      status: parsed['Status'],
      os: parsed['OS'],
      milestone: Number(getLabel('M', labels) || getLabel('Launch-M-Approved', labels, 'Stable')),
      otMilestone: Number(getLabel('OriginTrial', labels)),
      otEndMilestone: Number(getLabel('OriginTrialEnd', labels)),
      targetMilestone: Number(getLabel('Target', labels)),
      devTrialMilestone: Number(getLabel('DevTrial', labels)),
      summary: parsed['Summary'],
      owner: parsed['Owner'],
      components: parsed['Component'].split(/,\s*/g),
      stars: parsed['Stars'],
      labels: labels,
    };

    // Use Target-X as a fallback if M-X is not present.
    if (row.targetMilestone && !row.milestone) {
      row.milestone = row.targetMilestone;
    }

    if (row.otMilestone && !row.otEndMilestone) {
      row.otEndMilestone = row.milestone ? (row.milestone - 1) : (row.otMilestone + kDefaultOTDuration - 1);
    }

    return row;
  });

  // More processing....

  function assignPartition(row) {
    if (row.milestone && row.milestone <= kStableMilestone) {
      return Partitions.shipped;
    }

    // EXPERIMENTAL: For things that finished w/o dates
    if (!row.milestone && row.status === 'Fixed') {
      return Partitions.fixed;
    }

    if (row.otMilestone && row.otMilestone <= kStableMilestone) {
      return Partitions.originTrial;
    }

    if (row.devTrialMilestone && row.devTrialMilestone <= kStableMilestone) {
      return Partitions.devTrial;
    }

    if (row.status === 'Started') {
      return Partitions.started;
    }

    return Partitions.backlog;
  }

  // Generic compareFunc for sorting, returning -1/0/1. Works for strings or numbers.
  function cmp(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
  }

  // Milestone compare - treat "no milestone" as greater than any milestone.
  function cmpMilestone(a, b) {
    return cmp(a || 999, b || 999);
  }

  function compareRows(a, b) {
    if (a.partition !== b.partition) {
      return cmp(a.partition, b.partition);
    }

    if (a.partition === Partitions.shipped) {
      a.sortMilestone = a.milestone;
      b.sortMilestone = b.milestone;
    } else if (a.partition === Partitions.originTrial) {
      a.sortMilestone = a.otEndMilestone;
      b.sortMilestone = b.otEndMilestone;
    } else {
      a.sortMilestone = a.devTrialMilestone || a.otMilestone || a.milestone;
      b.sortMilestone = b.devTrialMilestone || b.otMilestone || b.milestone;
    }

    return cmpMilestone(a.sortMilestone, b.sortMilestone) ||
           cmp(a.id, b.id);
  }

  features.forEach(feature => {
    function owner(s) {
      if (!s) return s;
      let org = s.split('@')[1].split('.')[0];
      if (org === 'chromium') org = 'google';
      return org.charAt(0).toUpperCase() + org.slice(1);
    }

    feature.owner = owner(feature.owner);

    feature.partition = assignPartition(feature);


    // Symbols for desktop/mobile/pwa/...
    let where = '';
    if (/Linux|Chrome|Mac|Windows|All/.test(feature.os)) {
      where += `<span title="Desktop">${Glyphs.desktop}</span>`;
    }
    if (/Android|iOS|All/.test(feature.os)) {
      where += `<span title="Mobile">${Glyphs.mobile}</span>`;
    }
    if (feature.components.some(s => s.startsWith('UI>Browser>WebAppInstalls'))) {
      where += `<span title="PWA">${Glyphs.pwa}</span>`;
    }
    feature.where = where;
  });

  features = features
    .filter(row => row.status !== 'WontFix' && row.status !== 'Duplicate')
    .filter(row => row.type !== 'FLT-Launch')
    .filter(row => row.partition !== Partitions.fixed); // EXPERIMENTAL: Strip these out
  features.sort(compareRows);


  // ============================================================
  // Construct display

  // Map milestone to x position / width
  function mtox(m) {
    return 450 + (m - kFirstMilestone) * kPixelsPerMilestone;
  }
  function mtow(m) {
    return m * kPixelsPerMilestone;
  }

  function div(args) {
    return Object.assign(document.createElement('div'), args);
  }

  // ============================================================
  // Milestone labels/background

  let scrollTarget, lastTarget;
  {
    const mstoneContainer = div({id: 'milestones'});
    mstoneContainer.append(div({id: 'spacer'}));
    for (let m = kFirstMilestone; m < kMaxMilestone; ++m) {
      const label = div({className: 'mlabel', textContent: m});
      const column = div({className: 'milestone', textContent: m});

      if (m === kStableMilestone) label.innerHTML += ' <small>(stable)</small>';
      if (m === kStableMilestone+1) label.innerHTML += ' <small>(beta)</small>';
      if (m === kStableMilestone+2) label.innerHTML += ' <small>(canary)</small>';
      if (kStableMilestone <= m && m <= kStableMilestone+2) {
        label.classList.add('selected');
        column.classList.add('selected');
      }
      if (m === kStableMilestone-5) scrollTarget = label;
      lastTarget = label;

      $('#features').append(label);
      mstoneContainer.append(column);
    }
    $('#features').append(mstoneContainer);
  }




  function addSeparator(label, url) {
    const details = div({className: 'separator', textContent: label});
    if (url)
      details.innerHTML += ` (<a target=_blank href="${url}">details</a>)`;

    $('#features').append(details);
  }

  let curPartition;
  features.forEach(feature => {
    if (feature.partition !== curPartition) {
      curPartition = feature.partition;
      addSeparator(PartitionDetails[curPartition].label, PartitionDetails[curPartition].url);
    }


    const line = div({className: 'feature'});

    const details = div({className: 'details'});
    {
      let html = '';
      html += `<span class=name>${feature.summary}</span>`;
      if (feature.owner)
        html += `<span class=owner title="Issue owner affiliation"><span class=abbrev>${feature.owner[0]}</span><span class=full>${feature.owner}</span></span>`;

      html += `<span class=crbug title="Issue Tracker"><a target=_blank href="https://crbug.com/${feature.id}">${feature.id}</a></span>`;
      html += `<span class=stars title="${feature.stars} stars"><a target=_blank href="https://crbug.com/${feature.id}"><span class=bar style="width: ${Math.min(feature.stars, kMaxStars)/4}px"></span></a></span>`;

      html += `<span class=where>${feature.where}</span>`;
      details.innerHTML = `<div class=details-inner>${html}</div>`; // TODO: improve this construction
    }
    line.append(details);

    {
      let html = '';
      if (feature.otMilestone) {
        const start = feature.otMilestone;
        const end   = feature.otEndMilestone + 1;
        const x1 = mtox(start), x2 = mtox(end);
        html += `<span class=ot style="left: ${x1}px; width: ${x2-x1}px;">Origin Trial: M${feature.otMilestone} - M${feature.otEndMilestone}</span>`;
      }

      if (feature.devTrialMilestone) {
        const start = feature.devTrialMilestone;
        const end   = feature.otMilestone || feature.milestone || kMaxMilestone;
        const x1 = mtox(start), x2 = mtox(end);
        html += `<span class=timeline style="left: ${x1}px; width: ${x2-x1}px;"><span class=flag title="Available behind a flag starting in M${start}">${Glyphs.devTrial}</span></span>`;
      }

      if (feature.milestone) {
        const start = feature.milestone;
        const end   = kMaxMilestone;
        const x1 = mtox(start), x2 = mtox(end);
        html += `<span class=timeline style="left: ${x1}px; width: ${x2-x1}px;"><span class=ship title="Exposed by default starting in M${start}">${Glyphs.ship}</span></span>`;
      }

      line.innerHTML += html;
    }

    $('#features').append(line);

  });



  // Scroll all the way to the right, then back to the left.
  lastTarget.scrollIntoView();
  scrollTarget.scrollIntoView();
  $('#header').scrollIntoView();


});

/* TODOs

 * Years

 * Make features children of partition divs, to improve sticky header appearance?

 * Make URL in the title bar copy on click

*/
