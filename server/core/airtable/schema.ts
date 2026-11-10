// Airtable base "MVP Jedha Loodi mate" — IDs from CLAUDE.md. Never write computed fields.

export const T = {
  players: 'tbluswyc5kjhijKxJ',
  games: 'tblDk3LXpbar0LAB1',
  parties: 'tblgy5ycSeMQ6JPOZ',
  participations: 'tbl3ceg2pfP2EqirJ',
  events: 'tblOe6jCZGUYeeauA',
} as const

export const F = {
  players: {
    name: 'fld89EkONAx3tHxeY',
    device: 'fldFEjODj2Uk3WsqL',
    onboardedAt: 'flduJ35W19HoqlYjs',
    createdParties: 'fld6vtyT3bKcHlJ6g',
    participations: 'fldlItRFp18O7uV7T',
    events: 'fldhEnbNjTyS5MW0D',
  },
  games: {
    name: 'fldAnVODrYejo2dpw',
    bggId: 'fldlkTXCAgKHSiLU4',
    image: 'fldPilY9VREyMrjIQ',
    template: 'fldU8PkHgWoDNhb64',
    parties: 'fld5FCjjQkIpmarGS',
  },
  parties: {
    ref: 'fldtHgYlu2T6TOXSI',
    game: 'fldlOoPOBV1f7C7VN',
    creator: 'fldhWCXLEEWEa5X9E',
    status: 'fld1l7j5BZJPZMHGG',
    createdAt: 'fldvCakGk5g9zX3vx',
    finishedAt: 'flddAOHmIJeGxI5Gc',
    template: 'fldehUg7djsAAiY9g',
    rounds: 'fld3Cm14ZUZjv6MF9',
    creationSeconds: 'fld1czNj5gTVdtfI5',
    highlight: 'fldm563SLgRHEJ4Nq',
    shareToken: 'fldA184ebaPG5OCt7',
    photos: 'fldo336tSfRj2gjNX',
    participations: 'fldUJfNg76i4iN4bv',
    events: 'fldsAVnvavI3RWV1f',
  },
  participations: {
    ref: 'fldv5gNOFn90Xtz5u',
    party: 'fldwqgIYkOWuitIjx',
    player: 'fldcgjuCywGMzvZnZ',
    scores: 'fldb6Tco43rbJv3qC',
    total: 'flddk8mqHcmOuDH20',
    winner: 'fldubb4LPMPNqYKzu',
  },
  events: {
    id: 'fldWnp0mlT1GJhBB3',
    visitorId: 'fld0QTk20feR8pkla',
    action: 'fldaAhR3eM2AQazDR',
    origin: 'fldPy3TH2KX7OEF75',
    date: 'fld4INdNyFgepFDBr',
    party: 'fldYX3NPtUQKjgtOB',
    player: 'fldUeaM60JMHwL7cr',
  },
} as const
