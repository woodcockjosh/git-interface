import { EventEmitter } from 'events';
import { spawn } from 'child_process';

export interface IGitOptions {
	dir: string;
}

export class Git extends EventEmitter{

	protected options: IGitOptions;
	protected dir: string = '.';

	constructor(options: IGitOptions) {
		super();

		this.options = options;

		this.setDir(this.options.dir);
	}

	protected async gitExec(cmd: string): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			const child = spawn('git', cmd.split(' '), { cwd: this.dir });
			let out = '';

			child.stdout.on('data', (data) => { out += data.toString(); this.emit('out', data.toString()); });
			child.stdout.on('error', (data) => { out += data.toString(); this.emit('out', data.toString()); });
			child.stderr.on('data', (data) => { out += data.toString(); this.emit('out', data.toString()); });
			child.stderr.on('error', (data) => { out += data.toString(); this.emit('out', data.toString()); });

			child.on('close', (code: number, signal: string) => {
				if (code === 0) {
					resolve(out);
				} else {
					reject();
				}
			});
		});
	}

	protected getDiffFileList(diffOptions: string = ''): Promise<string[]> {
		return new Promise(async (resolve, reject) => {
			try {
				const conflicts = await this.gitExec(`diff ${diffOptions}`);

				resolve(conflicts.split('\n').filter(item => item.trim().length > 0));
			} catch (err) {
				reject(err);
			}
		});
	}

	public setDir(dir: string) {
		this.dir = dir;
	}

	public clone(repository: string, dest: string) {
		return this.gitExec(`clone ${repository} ${dest}`);
	}

	public checkout(branchName: string) {
		return this.gitExec(`checkout ${branchName}`);
	}

	/**
	 * Updates the git submodules.
	 *
	 * @param init initialize not-yet initialized submodules (--init), true by default
	 * @param recursive whether to update the nested submodules (--recursive), true by default
	 */
	public updateSubmodules(init: boolean = true, recursive: boolean = true) {
		let command = `submodule update`;
		if (init) {
			command += ` --init`;
		}
		if (recursive) {
			command += ` --recursive`;
		}
		return this.gitExec(command);
	}

	public commit(message: string) {
		return this.gitExec(`commit -am ${message}`);
	}

	public pull() {
		return new Promise(async (resolve, reject) => {
			try {
				const branch = await this.getBranchName();

				await this.gitExec(`pull origin ${branch}`);

				resolve()
			} catch (err) {
				reject(err);
			}
		});
	}

	public push() {
		return new Promise(async (resolve, reject) => {
			try {
				const branch = await this.getBranchName();

				await this.gitExec(`push origin ${branch}`);

				resolve()
			} catch (err) {
				reject(err);
			}
		});
	}

	public add() {
		return this.gitExec(`add -A`);
	}

	public merge(branchName: string, mergeOptions?: string) {
		return this.gitExec(`merge ${branchName} ${mergeOptions}`)
	}

	public fetch() {
		return this.gitExec(`fetch`);
	}

	public reset() {
		return this.gitExec(`reset --hard HEAD`);
	}

	public getHash(fileName: string) {
		return new Promise(async (resolve, reject) => {
			try {
				const result = await this.gitExec(`log -n 1 --pretty="%H" -- ${fileName}`);

				resolve(result.replace(/"/g, ''));
			} catch (err) {
				reject(err);
			}
		});
	}

	public diffMaster(fileName: string) {
		return this.gitExec(`diff master -- ${fileName}`);
	}

	public getBranchName() {
		return new Promise(async (resolve, reject) => {
			try {
				const result: string = await this.gitExec(`branch`);

				resolve(result.split('\n').find(item => item.indexOf('*') === 0).replace(/\*/g, '').trim());
			} catch (err) {
				reject(err);
			}
		});
	}

	public createBranch(branchName: string) {
		return this.gitExec(`checkout -b ${branchName}`);
	}

	public getDiffByRevisionFileList(revision: string): Promise<string[]> {
		return this.getDiffFileList(`${revision} --name-only`);
	}

	public getConflictList(): Promise<string[]> {
		return this.getDiffFileList(`--name-only --diff-filter=U`);
	}

	public getUncommittedList(): Promise<string[]> {
		return this.getDiffFileList(`--name-only`);
	}

	public getLastChanges() {
		return new Promise(async (resolve, reject) => {
			try {
				const hash = await this.gitExec(`log -n 2 --pretty="%H"`);
				let lastOtherHash = hash.split('\n')[1];

				if (!lastOtherHash) {
					lastOtherHash = hash.slice(hash.length / 2);
				}

				lastOtherHash = lastOtherHash.replace(/"/g, '');

				const lastChanges = await this.gitExec(`difftool ${lastOtherHash} --name-status`);

				resolve(lastChanges);
			} catch (err) {
				reject(err);
			}
		});
	}

	public removeLocalBranch(branchName: string) {
		return this.gitExec(`branch -D ${branchName}`);
	}

	public removeRemoteBranch(branchName: string) {
		return this.gitExec(`push origin --delete ${branchName}`);
	}

	public getLocalBranchList() {
		return new Promise(async (resolve, reject) => {
			try {
				const result = await this.gitExec(`branch`);
				const branches = result.split('\n')
					.map((item: string) => item.replace(/^\s*\*/, '').trim())
					.filter((item: string) => item.length > 0);

				resolve(branches);
			} catch (err) {
				reject(err);
			}
		});
	}

	public getRemoteBranchList() {
		return new Promise(async (resolve, reject) => {
			try {
				const result = await this.gitExec(`branch -r`);
				const branches = result.split('\n')
					.filter((item: string) => item.length > 0 && item.indexOf('origin/HEAD') === -1)
					.map((item: string) => item.replace(/^\s*\*/, '').replace('origin/', '').trim());

				resolve(branches);
			} catch (err) {
				reject(err);
			}
		});
	}

	public getTimeOfLastCommit(branchName: string) {
		return new Promise(async (resolve, reject) => {
			try {
				const result = await this.gitExec(`show --format='%ci' ${branchName}`);
				const dateTimeStr = result.split('\n')[0].split(' ');
				const date = new Date(`${dateTimeStr[0]} ${dateTimeStr[1]} ${dateTimeStr[2]}`);

				resolve(date.getTime());
			} catch (err) {
				reject(err);
			}
		});
	}

	public getHashOfLastCommit(branchName: string) {
		return new Promise(async (resolve, reject) => {
			try {
				const result = await this.gitExec(`log ${branchName} --pretty="%H"`);

				resolve(result.split('\n')[0].replace(/"/g, ''));
			} catch (err) {
				reject(err);
			}
		});
	}

}