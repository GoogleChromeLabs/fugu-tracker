
/* TODOs

 * Years

 * Make features children of partition divs, to improve sticky header appearance?

 * Make URL in the title bar copy on click

*/

window.addEventListener('DOMContentLoaded', async e => {

  const $ = document.querySelector.bind(document);
  const $$ = s => [...document.querySelectorAll(s)];


  $('#copy-url').addEventListener('click', e => {
    navigator.clipboard.writeText(document.location);
    e.target.classList.add('clicked');
    setTimeout(_ => e.target.classList.remove('clicked'), 500);
  });

  // ============================================================
  //
  // Fetch and process data
  //
  // ============================================================

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
        while ((match = re.exec(line))) matches.push(match[1]);
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

    // Partition (state - used for sorting)

    function partition(row) {
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

    feature.partition = partition(feature);

    // Owner

    function owner(s) {
      if (!s) return s;
      let org = s.split('@')[1].split('.')[0];
      if (org === 'chromium') org = 'google';
      return org.charAt(0).toUpperCase() + org.slice(1);
    }

    feature.owner = feature.partition !== Partitions.backlog
      ? owner(feature.owner) : undefined;


    // Symbols for desktop/mobile/pwa/...
    let where = '';
    if (/Linux|Chrome|Mac|Windows|All/.test(feature.os)) {
      where += `<span title="Desktop">${Glyphs.desktop}</span>`;
    } else {
      where += `<span></span>`;
    }
    if (/Android|iOS|All/.test(feature.os)) {
      where += `<span title="Mobile">${Glyphs.mobile}</span>`;
    } else {
      where += `<span></span>`;
    }
    if (feature.components.some(s => s.startsWith('UI>Browser>WebAppInstalls'))) {
      //where += `<span title="PWA">${Glyphs.pwa}</span>`;
      where += `<img src=pwalogo.svg height=12 title="PWA">`;
    } else {
      where += `<span></span>`;
    }
    feature.where = where;
  });

  features = features
    .filter(row => row.status !== 'WontFix' && row.status !== 'Duplicate')
    .filter(row => row.type !== 'FLT-Launch')
    .filter(row => row.partition !== Partitions.fixed); // EXPERIMENTAL: Strip these out
  features.sort(compareRows);


  // ============================================================
  //
  // Construct display
  //
  // ============================================================

  // Map milestone to x position / width
  function mtox(m) {
    if (m >= 82) --m;
    return kDetailsWidth + (m - kFirstMilestone) * kPixelsPerMilestone;
  }

  function elem(name, args, children) {
    const e = Object.assign(document.createElement(name), args);
    if (children) e.append(...children);
    return e;
  }
  function div(args, children) {
    return elem('div', args, children);
  }
  function span(args, children) {
    return elem('span', args, children);
  }

  // ============================================================
  // Milestone labels/background

  let scrollTarget, lastTarget;
  {
    const mstoneContainer = div({id: 'milestones'});
    mstoneContainer.append(div({id: 'spacer'}));
    for (let m = kFirstMilestone; m < kMaxMilestone; ++m) {
      if (m === 82)
        continue;

      const label = div({className: 'mlabel', textContent: m});
      const column = div({className: 'milestone', textContent: m});

      if (m === kStableMilestone) label.append(elem('small', {textContent: '(stable)'}));
      if (m === kStableMilestone+1) label.append(elem('small', {textContent: '(beta)'}));
      if (m === kStableMilestone+2) label.append(elem('small', {textContent: '(canary)'}));
      if (kStableMilestone <= m && m <= kStableMilestone+2) {
        label.classList.add('selected');
        column.classList.add('selected');
      }


      if (m === kStableMilestone)
        scrollTarget = label;

      lastTarget = label;

      $('#features').append(label);
      mstoneContainer.append(column);
    }
    $('#features').append(mstoneContainer);
  }


  // ============================================================
  // Features

  function addSeparator(label, url) {
    const details = div({className: 'separator', textContent: label});
    if (url)
      details.append(' (', elem('a', {target: '_blank', href: url, textContent: 'details'}), ')');

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
      const inner = div({className: 'details-inner'});
      let html = '';
      inner.append(span({className: 'name', textContent: feature.summary}));
      if (feature.owner) {
        inner.append(span(
          {
            className: 'owner',
            title: 'Issue owner affiliation'
          },
          [
            span({className: 'abbrev', textContent: feature.owner[0]}),
            span({className: 'full', textContent: feature.owner})
          ]
        ));
      }
      inner.append(span({className: 'crbug', title: 'Issue Tracker'}, [
        elem('a', {target: '_blank',
                   href: `https://crbug.com/${feature.id}`,
                   textContent: feature.id})]));

      const bar = span({className: 'bar'});
      bar.style.width = `${Math.min(feature.stars, kMaxStars)/4}px`;
      inner.append(span({className: 'stars', title: feature.stars}, [
        elem('a',
             {target: '_blank', href: `https://crbug.com/${feature.id}`},
             [bar])]));

      inner.append(span({className: 'where', innerHTML: feature.where}));

      details.append(inner);
    }
    line.append(details);

    {
      let html = '';
      if (feature.otMilestone) {
        const start = feature.otMilestone;
        const end   = feature.otEndMilestone + 1;
        const x1 = mtox(start), x2 = mtox(end);
        const tag = span({
          className: 'ot',
          textContent: `Origin Trial: M${start} - M${end-1}`
        });
        tag.style.left = `${x1}px`;
        tag.style.width = `${x2-x1}px`;
        line.append(tag);
      }

      if (feature.devTrialMilestone) {
        const start = feature.devTrialMilestone;
        const end   = feature.otMilestone || feature.milestone || kMaxMilestone;
        const x1 = mtox(start), x2 = mtox(end);

        const tag = span({className: 'timeline'}, [
          span({className: 'flag',
                title: `Available behind a flag starting in M${start}`,
                textContent: Glyphs.devTrial})
        ]);

        tag.style.left = `${x1}px`;
        tag.style.width = `${x2-x1}px`;
        line.append(tag);
      }

      if (feature.milestone) {
        const start = feature.milestone;
        const end   = kMaxMilestone;
        const x1 = mtox(start), x2 = mtox(end);
        const tag = span({className: 'timeline'}, [
          span({className: 'ship',
                title: `Exposed by default starting in M${start}`,
                textContent: Glyphs.ship})
        ]);

        tag.style.left = `${x1}px`;
        tag.style.width = `${x2-x1}px`;
        line.append(tag);
      }

      line.innerHTML += html;
    }

    $('#features').append(line);

  });



  // Scroll all the way to the right, then back to the left.
  lastTarget.scrollIntoView();
  scrollTarget.scrollIntoView();
  $('#features').scrollLeft -= kDetailsWidth + kPixelsPerMilestone;
  $('#header').scrollIntoView();


});
