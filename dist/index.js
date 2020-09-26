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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Git = void 0;
const events_1 = require("events");
const child_process_1 = require("child_process");
class Git extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.dir = '.';
        this.options = options;
        this.setDir(this.options.dir);
    }
    gitExec(cmd) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const splitRegex = /'[^']+'|[^\s]+/g;
                const commandArgs = cmd.match(splitRegex).map(e => e.replace(/'(.+)'/, "'$1'"));
                const child = child_process_1.spawn('git', commandArgs, { cwd: this.dir });
                let out = '';
                child.stdout.on('data', (data) => { out += data.toString(); this.emit('out', data.toString()); });
                child.stdout.on('error', (data) => { out += data.toString(); this.emit('out', data.toString()); });
                child.stderr.on('data', (data) => { out += data.toString(); this.emit('out', data.toString()); });
                child.stderr.on('error', (data) => { out += data.toString(); this.emit('out', data.toString()); });
                child.on('close', (code, signal) => {
                    if (code === 0) {
                        resolve(out);
                    }
                    else {
                        reject(new Error(out));
                    }
                });
            });
        });
    }
    getDiffFileList(diffOptions = '') {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            try {
                const conflicts = yield this.gitExec(`diff ${diffOptions}`);
                resolve(conflicts.split('\n').filter(item => item.trim().length > 0));
            }
            catch (err) {
                reject(err);
            }
        }));
    }
    setDir(dir) {
        this.dir = dir;
    }
    clone(repository, dest, options) {
        const opt = options || { depth: Infinity };
        const depthOption = opt.depth !== Infinity ? ` --depth=${opt.depth}` : '';
        return this.gitExec(`clone ${repository} ${dest}${depthOption}`);
    }
    checkout(branchName) {
        return this.gitExec(`checkout ${branchName}`);
    }
    updateSubmodules(init = true, recursive = true) {
        let command = `submodule update`;
        if (init) {
            command += ` --init`;
        }
        if (recursive) {
            command += ` --recursive`;
        }
        return this.gitExec(command);
    }
    commit(message, all = false) {
        const escapedMessage = message.replace(/'/g, "\\'");
        const allOption = all ? 'a' : '';
        return this.gitExec(`commit -${allOption}m '${escapedMessage}'`);
    }
    pull() {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            try {
                const branch = yield this.getBranchName();
                yield this.gitExec(`pull origin ${branch}`);
                resolve();
            }
            catch (err) {
                reject(err);
            }
        }));
    }
    push(remote) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            try {
                const branch = yield this.getBranchName();
                yield this.gitExec(`push ${remote || 'origin'} ${branch}`);
                resolve();
            }
            catch (err) {
                reject(err);
            }
        }));
    }
    add() {
        return this.gitExec(`add -A`);
    }
    addRemote(name, url) {
        return this.gitExec(`remote add ${name} ${url}`);
    }
    setRemote(name, url) {
        return this.gitExec(`remote set-url ${name} ${url}`);
    }
    merge(branchName, mergeOptions) {
        return this.gitExec(`merge ${branchName} ${mergeOptions}`);
    }
    fetch() {
        return this.gitExec(`fetch`);
    }
    reset() {
        return this.gitExec(`reset --hard HEAD`);
    }
    getHash(fileName) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.gitExec(`log -n 1 --pretty="%H" -- ${fileName}`);
                resolve(result.replace(/"/g, ''));
            }
            catch (err) {
                reject(err);
            }
        }));
    }
    diffMaster(fileName) {
        return this.gitExec(`diff master -- ${fileName}`);
    }
    getBranchName() {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.gitExec(`branch`);
                resolve(result.split('\n').find(item => item.indexOf('*') === 0).replace(/\*/g, '').trim());
            }
            catch (err) {
                reject(err);
            }
        }));
    }
    createBranch(branchName) {
        return this.gitExec(`checkout -b ${branchName}`);
    }
    deleteBranch(branchName) {
        return this.gitExec(`branch -D ${branchName}`);
    }
    getDiffByRevisionFileList(revision) {
        return this.getDiffFileList(`${revision} --name-only`);
    }
    getConflictList() {
        return this.getDiffFileList(`--name-only --diff-filter=U`);
    }
    getUncommittedList() {
        return this.getDiffFileList(`--name-only`);
    }
    getLastChanges() {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            try {
                const hash = yield this.gitExec(`log -n 2 --pretty="%H"`);
                let lastOtherHash = hash.split('\n')[1];
                if (!lastOtherHash) {
                    lastOtherHash = hash.slice(hash.length / 2);
                }
                lastOtherHash = lastOtherHash.replace(/"/g, '');
                const lastChanges = yield this.gitExec(`difftool ${lastOtherHash} --name-status`);
                resolve(lastChanges);
            }
            catch (err) {
                reject(err);
            }
        }));
    }
    removeLocalBranch(branchName) {
        return this.gitExec(`branch -D ${branchName}`);
    }
    removeRemoteBranch(branchName) {
        return this.gitExec(`push origin --delete ${branchName}`);
    }
    getLocalBranchList() {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.gitExec(`branch`);
                const branches = result.split('\n')
                    .map((item) => item.replace(/^\s*\*/, '').trim())
                    .filter((item) => item.length > 0);
                resolve(branches);
            }
            catch (err) {
                reject(err);
            }
        }));
    }
    getRemoteBranchList() {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.gitExec(`branch -r`);
                const branches = result.split('\n')
                    .filter((item) => item.length > 0 && item.indexOf('origin/HEAD') === -1)
                    .map((item) => item.replace(/^\s*\*/, '').replace('origin/', '').trim());
                resolve(branches);
            }
            catch (err) {
                reject(err);
            }
        }));
    }
    getRemotes() {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.gitExec(`remote`);
                const remoteNames = result
                    .split('\n')
                    .map((item) => item.trim());
                resolve(remoteNames);
            }
            catch (err) {
                reject(err);
            }
        }));
    }
    getRemoteUrl(name) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.gitExec(`remote get-url ${name}`);
            return result.trim();
        });
    }
    getTimeOfLastCommit(branchName) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.gitExec(`show --format='%ci' ${branchName}`);
                const dateTimeStr = result.split('\n')[0].split(' ');
                const date = new Date(`${dateTimeStr[0]} ${dateTimeStr[1]} ${dateTimeStr[2]}`);
                resolve(date.getTime());
            }
            catch (err) {
                reject(err);
            }
        }));
    }
    getHashOfLastCommit(branchName) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.gitExec(`log ${branchName} --pretty="%H"`);
                resolve(result.split('\n')[0].replace(/"/g, ''));
            }
            catch (err) {
                reject(err);
            }
        }));
    }
}
exports.Git = Git;
