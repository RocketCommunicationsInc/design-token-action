"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const core = require('@actions/core');
const fs = require('fs');
const github = require('@actions/github');
const { exec } = require('child_process');
const { promisify } = require('util');
const { parseCompare } = require('./functions');
const glob = require('glob');
function readBranchFile(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            fs.readFile(filePath, 'utf8', (error, data) => {
                if (error) {
                    console.error(`Error reading file: ${filePath}`);
                    return {};
                }
                try {
                    const jsonObject = JSON.parse(data.toString());
                    resolve(jsonObject);
                }
                catch (parseError) {
                    console.error('Error parsing file on branch');
                    reject(parseError);
                }
            });
        });
    });
}
function readDefaultFile(tokenPath, defaultBranch) {
    return __awaiter(this, void 0, void 0, function* () {
        // Sanitize user inputs to avoid command injection
        const sanitizedTokenPath = tokenPath.replace(/[^a-zA-Z0-9_-]/g, ''); // Remove any characters not allowed in the token path
        const sanitizedDefaultBranch = defaultBranch.replace(/[^a-zA-Z0-9_-]/g, ''); // Remove any characters not allowed in the default branch name
        const command = `git show origin/${sanitizedDefaultBranch}:${sanitizedTokenPath}`;
        // Use promisify to convert exec to a promise-based function
        const execPromise = promisify(exec);
        try {
            const { stdout } = yield execPromise(command);
            // Since we're parsing JSON, also sanitize the JSON data to prevent potential JSON injections
            const safeJsonObject = JSON.parse(sanitizeJson(stdout));
            return safeJsonObject;
        }
        catch (error) {
            console.error(`Error reading ${tokenPath}:`);
            return {};
        }
    });
}
function sanitizeJson(jsonString) {
    // Replace any unsafe characters in the JSON string
    return jsonString.replace(/[^a-zA-Z0-9{}[\]:,".\-_ ]/g, '');
}
function createChangeRow(change) {
    return `
| ${change.type} | ${change.name} | \`${change.old}\` | \`${change.new}\` |`;
}
function writeComment(body) {
    return __awaiter(this, void 0, void 0, function* () {
        const repoToken = core.getInput('repo-token', { required: true });
        const octokit = github.getOctokit(repoToken);
        const context = github.context;
        const { pull_request } = context.payload;
        yield octokit.rest.issues.createComment(Object.assign(Object.assign({}, context.repo), { issue_number: pull_request.number, body: body }));
    });
}
function compare() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const defaultBranch = core.getInput('default-branch', { required: false });
            const fileList = core.getInput('files', { required: true });
            let files = [];
            const filePatterns = fileList.split(',');
            for (const filePattern of filePatterns) {
                const matchedFiles = glob.sync(filePattern.trim());
                files.push(...matchedFiles);
            }
            let body = `
  | Type | Token Name | Old Value | New Value |
  | ---- | ---- | ----- | --- |`;
            let changes = [];
            for (const file of files) {
                const mainTokens = yield readDefaultFile(file, defaultBranch);
                const branchTokens = yield readBranchFile(file);
                const output = parseCompare(mainTokens, branchTokens);
                output.map((change) => {
                    changes.push(change);
                    const newLine = createChangeRow(change);
                    body += newLine;
                });
            }
            if (changes.length > 0) {
                yield writeComment(body);
            }
            else {
                core.info('No changes found');
            }
            core.setOutput('changes', changes);
        }
        catch (error) {
            core.setFailed(error);
        }
    });
}
compare();
