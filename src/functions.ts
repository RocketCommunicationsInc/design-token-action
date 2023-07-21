import { Diff } from 'deep-diff'

type TokenSet = {
  [key: string]: TokenSet | TokenNode
}

const diff = require('deep-diff')

function filterByLastItemIsValue(paths: Array<string>) {
  if (paths.length === 0 || paths[paths.length - 1] !== 'value') {
    // If the last element is not "value" or the array is empty, return an empty array
    return []
  }
  return paths.slice(0, -1)
}

interface TokenNode {
  value: string
  [key: string]: string
}

function getName(item: Diff<TokenNode>) {
  if (item.kind === 'E') {
    return item?.path?.slice(0, -1).join('-')
  }
  return item.path?.join('-')
}

function getValue(token: TokenNode) {
  if (!token) {
    return 'N/A'
  }
  if (typeof token === 'object') {
    return token.value
  }
  return token
}

function parseCompare(mainTokens: TokenSet, branchTokens: TokenSet) {
    const output = []
  try {

    const result = diff(mainTokens, branchTokens)

    if (result) {

      for (const item of result) {
        const types = {
          E: 'edited',
          N: 'added',
          D: 'deleted'
        }

        if (item.kind === 'E') {
          const itemsOnly = filterByLastItemIsValue(item.path)
          if (itemsOnly.length > 0) {
            output.push({
              //@ts-ignore
              type: types[item.kind],
              name: getName(item),
              old: getValue(item.lhs),
              new: getValue(item.rhs)
            })
          }
        } else {
          output.push({
            //@ts-ignore
            type: types[item.kind],
            name: getName(item),
            old: getValue(item.lhs),
            new: getValue(item.rhs)
          })
        }
      }
    } else {
      console.log('no diff')
    }
    return output
  } catch (e) {

    console.error(e)
    return output
  }
}

module.exports = {
  parseCompare: parseCompare
}
