const kStableMilestone = 80;

const kDefaultOTDuration = 3; // milestones; used if OT but no ship milestone.
const kMaxStars = 100;

const Partitions = Object.freeze({
  shipped: 0,
  fixed: 1,
  originTrial: 2,
  devTrial: 3,
  started: 4,
  backlog: 5
});

const PartitionDetails = Object.freeze({
  [Partitions.shipped]: {
    label: 'Shipped'
  },
  [Partitions.fixed]: {
    label: 'Fixed' },
  [Partitions.originTrial]: {
    label: 'Origin Trial',
    url: 'https://github.com/GoogleChrome/OriginTrials/blob/gh-pages/developer-guide.md'
  },
  [Partitions.devTrial]: {
    label: 'Dev Trial - behind a flag',
    url: 'https://web.dev/fugu-status/'
  },
  [Partitions.started]: {
    label: 'Started'
  },
  [Partitions.backlog]: {
    label: 'Under Consideration (star & comment the bug)'
  },
});
