#! /usr/bin/env node

const inquirer = require('inquirer');
const fs = require('fs');
const axios = require('axios');
const urlParser = require('url-parse');
const _ = require('ramda');
const moment = require('dayjs');

const basePath = './http/api';

const getSwaggerJson = (url) => {
  return axios.get(url)
}

const getHttpFileData = (env, url, data) => {
  const origin = urlParser(url).origin;
  const paths = data.data.paths;
  return Object.keys(paths).reduce((pre, cur) => {
    const str = Object.keys(paths[cur]).reduce((itemContent, method) => {
      const itemStr = `### ${paths[cur][method].tags.join('-')}  ====>  ${paths[cur][method].summary}
${method.toUpperCase()} ${env === 'webstorm' ? '{{url}}' : origin}${cur}
Cache-Control: no-cache
Content-Type:application/json  \r\n
${method.toUpperCase() === 'POST' ? `{}` : ''} \r\n
`
      itemContent += itemStr;
      return itemContent;
    }, '');
    pre += str;
    return pre
  }, '');
}

const writeInFile = (path, content) => {
  const dirPath = path.substring(0, path.lastIndexOf('/'));
  if (fs.existsSync(dirPath)) {
    fs.writeFile(path, content, () => {
      console.log('写入成功');
    })
  } else {
    fs.mkdir(dirPath, {recursive: true}, () => {
      fs.writeFile(path, content, () => {
        console.log('创建成功');
      })
    })
  }
  return true;
}

const getHttpEnvFileData = (url) => {
  const origin = urlParser(url).origin;
  const httpEnvFileContent = {
    "dev1": {
      "url": origin,
      "username": "test",
      "password": "123456"
    },
    "uat1": {
      "url": origin,
      "username": "test",
      "password": "123456"
    }
  };
  return JSON.stringify(httpEnvFileContent, null, 4)
}

const writeInHttpEnvFileByEnv = (env, url) => {
  const httpEnvPath = `${basePath}/http-client.private.env.json`;
  const writeInHttpEnvFile = _.curry(writeInFile)(httpEnvPath);
  return _.cond([
    [() => _.equals('webstorm', env), () => _.compose(writeInHttpEnvFile, getHttpEnvFileData)(url)]
  ])
}

const start = async () => {
  const promptList = [
    {
      type: 'list',
      message: '请选择常用的编辑器:',
      name: 'editor',
      choices: [
        "webstorm",
        "vscode",
      ],
    },
    {
      type: 'input',
      message: '输入swagger地址:',
      name: 'swaggerUrl',
      // default: "http://hui-insureprocess-server.hbhp-dev-1.svc.cluster.devel:9090/v2/api-docs?group=hbhp_admin" // 默认值
      default: "https://generator.swagger.io/api/swagger.json" // 默认值
    }
  ];
  const { swaggerUrl: url, editor: env } = await inquirer.prompt(promptList);
  const date = moment(new Date()).format('YYYY-MM-DD HH:mm:ss').replace(/-/g, '').replace(/:/g, '').replace(/\s+/g, '');
  const httpPath = `${basePath}/${env}.${date}.http`;
  const writeInHttpFile = _.curry(writeInFile)(httpPath);
  _.composeP(writeInHttpEnvFileByEnv(env, url), writeInHttpFile, _.curry(getHttpFileData)(env, url), getSwaggerJson)(url);
}

start().then();