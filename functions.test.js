const {parseCompare} = require('./src/functions')

const baseline = {
  color: {
    background: {
      fg: {
        type: 'color',
        value: '#FACADE',
        rawValue: '#FACADE'
      },
      bg: {
        type: 'color',
        value: '#FA3AD1',
        rawValue: '#FA3AD1'
      }
    }
  }
}

test('it properly formats adding additional layers', async () => {
  const output = parseCompare(
    {
      first: {
        second: {
          third: {
            value: '1px'
          }
        }
      }
    },
    {
      first: {
        second: {
          third: {
            fourth: {
              value: '1px'
            }
          }
        }
      }
    }
  )
  expect(output).toEqual([
    {
      type: 'deleted',
      name: 'first-second-third',
      old: '1px',
      new: 'N/A'
    },
    {
      type: 'added',
      name: 'first-second-third-fourth',
      old: 'N/A',
      new: '1px'
    }
  ])
})

test('it properly formats removing additional layers', async () => {
  const output = parseCompare(
    {
      first: {
        second: {
          third: {
            fourth: {
              value: '1px'
            }
          }
        }
      }
    },
    {
      first: {
        second: {
          third: {
            value: '1px'
          }
        }
      }
    }

  )
  console.log(output);
  expect(output).toEqual([
    {
      type: 'deleted',
      name: 'first-second-third-fourth',
      old: '1px',
      new: 'N/A'
    },
    {
      type: 'added',
      name: 'first-second-third',
      old: 'N/A',
      new: '1px'
    },
  ])
})

test('it properly formats deleted nodes', async () => {
  const output = parseCompare(baseline, {
    color: {
      background: {
        fg: {
          type: 'color',
          value: '#FACADE',
          rawValue: '#FACADE'
        }
      }
    }
  })
  expect(output).toEqual([
    {
      type: 'deleted',
      name: 'color-background-bg',
      old: '#FA3AD1',
      new: 'N/A'
    }
  ])
})

test('it properly formats added nodes', async () => {
  const output = parseCompare(baseline, {
    color: {
      background: {
        fg: {
          type: 'color',
          value: '#FACADE',
          rawValue: '#FACADE'
        },
        bg: {
          type: 'color',
          value: '#FA3AD1',
          rawValue: '#FA3AD1'
        },
        ng: {
          type: 'color',
          value: '#e3e3e3',
          rawValue: '#e3e3e3'
        }
      }
    }
  })
  expect(output).toEqual([
    {
      type: 'added',
      name: 'color-background-ng',
      old: 'N/A',
      new: '#e3e3e3'
    }
  ])
})

test('it properly formats editted nodes', async () => {
  const output = parseCompare(baseline, {
    color: {
      background: {
        fg: {
          type: 'color',
          value: '#FACADE',
          rawValue: '#FACADE'
        },
        bg: {
          type: 'color',
          value: '#AA3AD1',
          rawValue: '#AA3AD1'
        }
      }
    }
  })
  expect(output).toEqual([
    {
      type: 'edited',
      name: 'color-background-bg',
      old: '#FA3AD1',
      new: '#AA3AD1'
    }
  ])
})
