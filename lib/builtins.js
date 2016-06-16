'use strict';

module.exports = {
  get_date$: {
    type: 'Function',
    builtin: true,
    paramTypes: [
    ],
    resultType: 'Int[]'
  },
  get_time$: {
    type: 'Function',
    builtin: true,
    paramTypes: [
    ],
    resultType: 'Int'
  },
  read$: {
    type: 'Function',
    builtin: true,
    paramTypes: [
      'Int[]',
      'Int',
      'Int'
    ],
    resultType: 'Int'
  },
  read_int$: {
    type: 'Function',
    builtin: true,
    paramTypes: [],
    resultType: 'Int'
  },
  read_ints$: {
    type: 'Function',
    builtin: true,
    paramTypes: [
      'Int'
    ],
    resultType: 'Int[]'
  },
  write$: {
    type: 'Function',
    builtin: true,
    paramTypes: [
      'Int[]',
      'Int',
      'Int'
    ],
    resultType: null
  },
  write_ints$: {
    type: 'Function',
    builtin: true,
    paramTypes: [
      'Int[]'
    ],
    resultType: null
  },
  write_int$: {
    type: 'Function',
    builtin: true,
    paramTypes: [
      'Int'
    ],
    resultType: null
  }
};
