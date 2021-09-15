### lefe-cli 

```
这是一个内部使用的简易的脚手架

它就是个工具，方便我们新建项目用的，有了这个项目我们就能直接开发了。脚手架的本质也是从远程下载一个模板来进行一个新项目。脚手架可是高级版的克隆，它主要是提供了交互式的命令让我们可以动态的更改模板，然后用一句命令就可以一劳永逸了（当然还是要维护的），这应该是最主要的区别。
```

### 安装

```
npm i lefe-cli -g
```

### 用法-指令

#### 添加模板地址指令 lefe add

```
left add 

? 请输入模板名称 name
? 请输入模板地址 http仓库地址url

如果仓库http地址无法使用报错128,可以使用数字IP,查看数字IP可以登录仓库,查看控制台Network里,
例:http://00.000.000.00:0000/lefe/vue-template.git
可以指定分支,后面加 #分支名
例:http://gitlab.lefe.com:7070/lefe/vue-template.git#分支名
```

#### 删除模板地址指令 lefe delete

```
lefe delete name

name 参数是模板名称
```

#### 查看模板列表指令 lefe list

```
lefe list

会在控制台输入模板列表
```

#### 初始化模板项目指令 lefe init

```
lefe init <template-name> [folder-name]

参数<template-name>:模板名称 (必须)
参数[folder-name]:要创建的项目文件夹名称 (必须)
例: lefe init name name

执行 init 指令前,需要执行 add 指令添加地址
根据提示进行操作

仓库中有sdk.js文件可以进行编译
仓库中没有sdk.js文件会直接复制到当前文件夹
lefe init 下来的文件夹没有.git文件夹,不关联仓库

目前只设置了 .js .json 文件里面有 <%=xxx%> 进行编译替换

其它注意事项:
模板中,
"version": "1.0.0",
"private": true,
这两个节点最好定死,不要使用编译,布尔值会转换成字符串,
版本号npm i 的时候需要固定格式 1.0.0 不然报错
```

### 配置模板

```
模板中需要提供 ask.js 文件,和 <%=占位符%> ,才能进行编译

例:
// package.json
{
  "name": "<%=name%>"
}

// ask.js
module.exports = [
  {
    type:'input',
    name:'name',
    message:'项目名称'
  },
]

type: '类型' 具体类型可以去 inquirer - npm 查看
'confirm' (y/n)  'input' 输入框
name: '变量名' 需要和 <%=占位符%> 对应 
message: '提示信息'
```

### 技术栈

- inquirer  这是个强大的交互式命令行工具

  ```js
  const inquirer = require('inquirer');
  inquirer
    .prompt([
      // 一些交互式的问题
    ])
    .then(answers => {
      // 回调函数，answers 就是用户输入的内容，是个对象
    });
  ```

- download-git-repo  从 node.js 下载并提取一个 git 存储库

  ```js
  const download = require('download-git-repo')
  download(repository, destination, options, callback)
  
  // 其中 repository 是远程仓库地址；destination 是存放下载的文件路径，也可以直接写文件名，默认就是当前目录；options 是一些选项，比如{ clone：boolean }表示用 http download 还是 git clone 的形式下载。
  ```

- ora   这是一个加载Loding效果

  ```js
  const ora = require('ora')
  let spinner = ora('downloading template ...')
  spinner.start()
  ```

- commander   用来编写指令和处理命令行的

  ```js
  const program = require("commander");
  // 定义指令
  program
    .version('0.0.1')
    .command('init', 'Generate a new project from a template')
    .action(() => {
      // 回调函数
    })
  // 解析命令行参数
  program.parse(process.argv);
  ```

- chalk  修改控制台输出内容样式的，比如颜色

  ```js
  const chalk = require('chalk');
  console.log(chalk.green('success'));
  console.log(chalk.red('error'));
  ```

- metalsmith  读取模板目录文件,调用一系列操作文件的插件,将结果写入目标目录

  ```js
  const Metalsmith = require('metalsmith'); 
  
  Metalsmith(__dirname)
    .source() // 读取路径
    .destination() // 输出路径
    .use((files, metalsmith, callback) => {
       // 通过引用修改files或metalsmith.metadata()参数
       // 然后调用callback以触发下一步
    }) // use 中间件
    .build(function(err) {
       // 结束回调
   	if (err) throw err;
   	    console.log('Build finished!');
  	});
  ```

- consolidate  配合ejs使用,进行转译相同键

  ```js
  const { promisify } = require('util');
  let { render } = require('consolidate').ejs;
  render = promisify(render);
  ```

- ejs  转译输出`<%= %>`

- ncp  拷贝文件(用于没有ask.js文件,直接拷贝)

### 一些报错

```
http有可能获取不到仓库,可以换成数字IP进行尝试

Error: 'git clone' failed with status 128
  报错原因:
	1.仓库路径不对
	2.本地缓存同名文件夹没有清除
	
Error: 'git checkout' failed with status 1
  缓存代码已经拉取下来了,算成功
```

### 缓存文件位置

```
mac 为环境变量 HOME 下.temp文件夹
windows 为环境变量 TEMP 下 .temp文件夹

// 获取缓存路径
const cachePath = `${
  process.env[process.platform === 'darwin' ? 'HOME' : 'TEMP']
}/.temp`;
```

参照文档https://blog.csdn.net/weixin_43820866/article/details/102768255
