const core = require('@actions/core')
const fs = require('fs')
const github = require('@actions/github')
const {exec} = require('child_process')
const {parseCompare} = require('./functions')
const glob = require('glob')

type TokenChange = {
  type: string
  name: string
  old: string
  new: string
}

async function readBranchFile(filePath: string) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (error: Error, data: Buffer) => {
      if (error) {
        console.error(`Error reading file: ${filePath}`)
        return {}
      }

      try {
        const jsonObject = JSON.parse(data.toString())
        resolve(jsonObject)
      } catch (parseError) {
        console.error('Error parsing file on branch')
        reject(parseError)
      }
    })
  })
}

async function readDefaultFile(tokenPath: string, defaultBranch: string) {
  const command = `git show origin/${defaultBranch}:${tokenPath}`

  return new Promise((resolve, reject) => {
    exec(command, (error: Error, stdout: Buffer, stderr: Buffer) => {
      if (error) {
        console.error(`Unable to find token path: ${tokenPath} `)
        return resolve({})
      }

      if (stderr) {
        console.error(`Command stderr: ${stderr}`)
        return resolve({})
      }

      try {
        const jsonObject = JSON.parse(stdout.toString())
        resolve(jsonObject)
      } catch (parseError) {
        console.error(`Error reading ${tokenPath}`)
        reject(parseError)
      }
    })
  })
}

function createChangeRow(change: TokenChange) {
  return `
| ${change.type} | ${change.name} | \`${change.old}\` | \`${change.new}\` |`
}

async function writeComment(body: string) {
  const repoToken = core.getInput('repo-token', {required: true})
  const octokit = github.getOctokit(repoToken)
  const context = github.context
  const {pull_request} = context.payload
  await octokit.rest.issues.createComment({
    ...context.repo,
    issue_number: pull_request.number,
    body: body
  })
}
async function compare() {
  try {
    const defaultBranch = core.getInput('default-branch', {required: false})
    const fileList = core.getInput('files', {required: true})
    let files = []
    const filePatterns = fileList.split(',')
    for (const filePattern of filePatterns) {
      const matchedFiles = glob.sync(filePattern.trim())
      files.push(...matchedFiles)
    }

    let body = `
  | Type | Token Name | Old Value | New Value |
  | ---- | ---- | ----- | --- |`

    let changes: TokenChange[] = []

    for (const file of files) {
      const mainTokens = await readDefaultFile(file, defaultBranch)
      const branchTokens = await readBranchFile(file)
      const output = parseCompare(mainTokens, branchTokens)
      output.map((change: TokenChange) => {
        changes.push(change)
        const newLine = createChangeRow(change)
        body += newLine
      })
    }

    if (changes.length > 0) {
      await writeComment(body)
    } else {
      core.info('No changes found')
    }

    core.setOutput('changes', changes)
  } catch (error) {
    core.setFailed(error)
  }
}

compare()
