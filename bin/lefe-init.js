#!/usr/bin/env node

const Metalsmith = require('metalsmith'); // 读取文件
const path = require('path');
const fs = require('fs');
const program = require('commander'); // 处理命令行的
// const exec = require('child_process').exec; // 输出命令行
const { promisify } = require('util');
const inquirer = require('inquirer'); // 交互式命令行
let { render } = require('consolidate').ejs; // 编译文件
render = promisify(render);
const chalk = require('chalk'); // 修改提示文字颜色
const ora = require('ora'); // 加载中
const chalkSuccess = text => console.log(chalk.green(text)); // 成功提示
const chalkError = text => console.log(chalk.red(text)); // 失败提示
let ncp = require('ncp'); // 拷贝
ncp = promisify(ncp);
const download = require('download-git-repo'); // 拉取仓库插件
const tplObj = require(`${__dirname}/../template`); // 获取仓库地址

// 获取缓存路径
const cachePath = `${
  process.env[process.platform === 'darwin' ? 'HOME' : 'TEMP']
}/.temp`;

// 处理命令行参数
program.usage('<template-name> [folder-name]');
program.parse(process.argv);

// 当没有输入参数的时候给个提示
if (program.args.length < 1) return program.help();

// 获取命令行参数
const templateName = program.args[0];
const folderName = program.args[1];

// 校验一下参数
if (!tplObj[templateName]) {
  console.log(chalk.red('\n Template does not exit! \n '));
  return;
}
if (!folderName) {
  console.log(chalk.red('\n folder should not be empty! \n '));
  return;
}

const url = tplObj[templateName]; // 获取仓库地址 url

console.log(chalk.white('\n Start generating... \n'));

// 打开loding
const spinner = ora('获取模板中......').start();

// 拉取仓库代码
download(
  `direct:${url}`, // 地址
  `${cachePath}`, // 保存路径
  { clone: true },
  function (err) {
    //失败回调
    if (('' + err).indexOf('status 128') !== -1) {
      spinner.fail('错误128 仓库名称不对或者其它原因 \n'); // 关闭loding 提示失败
      console.log(err);
      deleteFolder(cachePath); // 失败删除缓存
    } else if (('' + err).indexOf('status 1') !== -1) {
      // 这个错误代码已经拉到本地了,签出错误,影响不大,算成功
      spinner.succeed('获取成功 \n'); // 关闭loding 提示成功
      ask(folderName, cachePath); // 编译文件
    } else if (err) {
      spinner.fail('获取失败 \n'); // 关闭loding 提示失败
      console.log(err);
      deleteFolder(cachePath);
    } else {
      spinner.succeed('获取成功 \n'); // 关闭loding 提示成功
      ask(folderName, cachePath); // 编译文件
    }
  }
);
// };

// 编译文件函数 folderName 文件夹名字 cachePath 缓存文件路径
const ask = (folderName, cachePath) => {
  const is = fs.existsSync(`${cachePath}/ask.js`); // 判断有没有sdk.js
  // 没有ask文件说明不需要编译
  if (!is) {
    console.log('没有ask.js默认拷贝到当前文件夹');
    // 将下载的文件拷贝到当前执行命令的目录下
    ncp(cachePath, path.join(path.resolve(), folderName)).then(() => {
      deleteFolder(cachePath); // 删除缓存
      chalkSuccess(`\n 创建项目成功 请执行 \n cd ${folderName} \n npm i`);
    });
  } else {
    // 有sdk.js 编译文件夹
    const askUrl = path.join(cachePath, 'ask.js'); // 拿到ask里的数组
    new Promise((resolve, reject) => {
      // 读取文件;
      Metalsmith(__dirname)
        .source(cachePath) // 读取路径
        .destination(path.resolve(folderName)) // 输出路径
        // use 中间件
        .use(async (files, metal, done) => {
          const result = await inquirer.prompt(require(askUrl)); // 用户交互填写
          // 将询问的结果放在metaData中保证在下一个中间价中可以获取到
          const data = metal.metadata();
          Object.assign(data, result);
          delete files['ask.js'];
          done();
        })
        .use(async (files, metal, done) => {
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
            // 清空 README.md
            if (file.includes('README.md')) {
              files[file].contents = '';
            }
          });
          // 不能少
          done();
        })
        .build(async err => {
          if (!err) {
            // 项目创建成功
            deleteFolder(cachePath); // 删除缓存文件夹
            chalkSuccess(
              `\n 创建项目成功 请执行 \n cd ${folderName} \n npm i \n npm run serve`
            );
            resolve();
          } else {
            // 创建项目失败
            chalkError('\n 创建项目失败 文件夹已存在或者其它原因'); // 失败提示
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
