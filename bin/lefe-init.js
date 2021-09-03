#!/usr/bin/env node

const Metalsmith = require('metalsmith'); // 读取文件
const path = require('path');
const fs = require('fs');

const { promisify } = require('util');
const inquirer = require('inquirer'); // 互动效果
let { render } = require('consolidate').ejs; // 编译文件
render = promisify(render);
const chalk = require('chalk'); // 修改提示文字颜色
const ora = require('ora'); // 加载中
const chalkSuccess = text => console.log(chalk.green(text)); // 成功
const chalkError = text => console.log(chalk.red(text)); // 失败
let ncp = require('ncp');
ncp = promisify(ncp);
const download = require('download-git-repo'); // 拉取仓库插件

// 用户交互数组
const list = [
  {
    type: 'input',
    name: 'name',
    message: '模板仓库名字 格式 xxxx/xxxx',
  },
  {
    type: 'input',
    name: 'folder',
    message: '创建文件夹名字',
  },
];

// 获取缓存路径
const configFile = `${
  process.env[process.platform === 'darwin' ? 'HOME' : 'TEMP']
}/.temp`;

// 用户交互函数,需要数组
const userImport = async list => {
  const info = await inquirer.prompt(list);
  // console.log(info);
  return info;
};

// 10.106.249.15:7070
// pull binglian/vue-temp.git
// 拉取仓库函数 site 仓库名 downloadPath 缓存路径
const pull = (site, downloadPath) => {
  const spinner = ora('获取模板中......').start();
  // console.log(downloadPath);
  // console.log(site);
  download(
    `direct:http://10.106.249.15:7070/${site.name}.git`,
    // `direct:http://10.106.249.15:7070/liul/saas.git#common`,
    `${downloadPath}`,
    { clone: true },
    function (err) {
      // console.log(err);
      if (('' + err).indexOf('status 128') !== -1) {
        spinner.fail('错误128 仓库名称不对或者其它原因');
        console.log(err);
        deleteFolder(downloadPath);
      } else if (('' + err).indexOf('status 1') !== -1) {
        spinner.succeed('获取成功');
        // console.log('成功');
        ask(site, downloadPath); // 编译文件
      } else if (err) {
        // console.log(err);
        spinner.fail('获取失败');
        console.log(err);
        deleteFolder(downloadPath);
      } else {
        spinner.succeed('获取成功');
        ask(site, downloadPath);
      }
      // console.log(is === -1 ? 'Error' : 'Success');
    }
  );
};

// 编译文件函数 name 文件夹名字 downloadPath 缓存文件路径
const ask = (name, downloadPath) => {
  const is = fs.existsSync(`${downloadPath}/ask.js`);
  // 没有ask文件说明不需要编译
  if (!is) {
    console.log('没有sdk.js默认拷贝到当前文件夹');
    // 将下载的文件拷贝到当前执行命令的目录下
    ncp(downloadPath, path.join(path.resolve(), name.folder)).then(() => {
      deleteFolder(downloadPath);
      chalkSuccess(`创建项目成功 请执行 \n cd ${name.folder} \n npm i`);
    });
  } else {
    const askUrl = path.join(downloadPath, 'ask.js'); // 拿到ask里的数组
    // console.log(askUrl);
    new Promise((resolve, reject) => {
      Metalsmith(__dirname)
        .source(downloadPath)
        .destination(path.resolve(name.folder))
        .use(async (files, metal, done) => {
          const result = await inquirer.prompt(require(askUrl)); // 用户交互填写
          const data = metal.metadata();
          // 将询问的结果放在metaData中保证在下一个中间价中可以获取到
          Object.assign(data, result);
          delete files['ask.js'];
          done();
        })
        .use(async (files, metal, done) => {
          // console.log(metal);
          Reflect.ownKeys(files).forEach(async file => {
            let content = files[file].contents.toString(); // 获取文件中的内容
            // .js .json 文件才进行编译替换
            if (file.includes('.js') || file.includes('.json')) {
              // 文件中用<% 我才需要编译
              if (content.includes('<%')) {
                content = await render(content, metal.metadata()); // 用数据渲染模板
                files[file].contents = Buffer.from(content); // 渲染好的结果替换即可
              }
            }
          });
          // 不能少
          done();
        })
        .build(function (err) {
          if (!err) {
            // deleteFolder(`${path.resolve(name.folder)}/.git`); // 删除 .git 文件夹
            deleteFolder(downloadPath); // 删除缓存文件夹
            chalkSuccess(`创建项目成功 请执行 \n cd ${name.folder} \n npm i`); //成功提示

            resolve();
          } else {
            chalkError('创建项目失败 文件夹已存在或者其它原因'); // 失败提示
            reject();
          }
        });
    });
  }
};

// 删除文件夹
function deleteFolder(path) {
  let files = [];
  if (fs.existsSync(path)) {
    files = fs.readdirSync(path);
    files.forEach(function (file, index) {
      let curPath = path + '/' + file;
      if (fs.statSync(curPath).isDirectory()) {
        deleteFolder(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
}
// 执行
const compile = async () => {
  const info = await userImport(list);
  // console.log(info);
  pull(info, configFile);
};

compile();
