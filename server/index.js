const express = require('express')
const bodyParser = require('body-parser')
const os = require('os')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const mySQL = require('./mySQL')
const multiparty = require("multiparty")

//创建wab 服务器
const app = express()

let sql1 = "select * from files where file = ?;"
let sql2 = "insert into files(file) values(?);"
let sql3 = "insert into files set ?;"

// 静态文件托管
let staticPath = path.join(__dirname,'static')
app.use(express.static(staticPath))

// 解析 application/json
app.use(bodyParser.json()); 
// 解析 application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

app.use(cors())

// 上传
app.post('/update', cors(), (req,res)=>{
    const multipart = new multiparty.Form();
    multipart.parse(req, async (err, fields, files) => {
      if (!err) {
        let file = files.file[0]
        let [fileMd5] = fields.fileMd5
        let [fileName] = fields.fileName
        // 一些文件居然没后缀的,要处理一下
        const haveSuffix = ~fileName.lastIndexOf('.')
        let nameSuffix  // 文件后缀
        haveSuffix ? nameSuffix = fileName.slice(fileName.lastIndexOf('.'),fileName.length) : nameSuffix = ''
        let justMd5 = fileMd5.slice(0,fileMd5.lastIndexOf('-'))
        let folderPath = path.join(staticPath,'cache',justMd5)  // 所有切片的文件夹
        let dirPath = path.join(folderPath,`${fileMd5}${nameSuffix}`)
        if(!fs.existsSync(folderPath)){ fs.mkdirSync(folderPath) }  // static文件夹一定要保证有,否则就会报错
        const buffer = fs.readFileSync(file.path)  // 根据file对象的路径获取file对象里的内容
        fs.writeFile(dirPath,buffer,(err)=>{
            if(!err){
                res.send({result:1,msg:'单片上传完成',data:{folderPath,fileMd5,justMd5,nameSuffix,fileName}})
            }
        })
      }else{
        res.send({result:-1,msg:err})
      }
    })  
})
// 根据md5标识合并所有切片
app.post('/mergeSlice', cors(), (req,res)=>{
    let {folderPath,fileMd5,justMd5,nameSuffix,fileName} = req.body
    mergeChunks(folderPath,fileMd5,nameSuffix,(endPathUrl)=>{
        fs.rmdirSync(folderPath)  // 删除文件夹
        let needObj = { url:endPathUrl, name:fileName, md5:justMd5 }
        res.send({result:1,msg:'合并完成'})
        // 放到数据库,响应客户端所有接收完成
        // mySQL.query(sql3,needObj,(err2) => {
        //     !err2 ? res.send({result:1,msg:'所有接收完成'}) : ''
        // })
    })
})
// 查看有没这个文件
app.post('/checkFile', cors(), (req,res)=>{
    let { md5 } = req.body
    let finishDir = path.join(staticPath,'finish')
    fs.readdir(finishDir,(err,data)=>{
        if(!err){
            let otherArr = data.filter(item => item.slice(0,item.lastIndexOf('.')) === md5)
            if(otherArr.length > 0){
                res.send({result:-1,msg:'该文件已经上传完成了'})
            }else{
                res.send({result:1,msg:'还没上传过这个文件'})
            }
        }
    }) 
})
// 清空finish里的所有文件
app.post('/clearDir', cors(), (req,res)=>{
    try{
        let finishDir = path.join(staticPath,'finish')
        let cacheDir = path.join(staticPath,'cache')
        const files = fs.readdirSync(finishDir)
        const filesB = fs.readdirSync(cacheDir)
        for (const file of files) {
            // 注意:git是不能接收空文件夹的,.gitignore文件相当于空文件夹的占位文件夹,不能删它,如果删了它文件夹一空git会主动把你的空文件删掉
            file !== '.gitignore' ? fs.unlinkSync(`${finishDir}/${file}`) : ''
        }
        for (const file of filesB) {
            // node.js不支持删除有文件的文件夹,这种情况下就只能递归处理了
            file !== '.gitignore' ? rmdirSync(`${cacheDir}/${file}`) : ''
        }
        res.send({result:1,msg:'清空成功'})
    }catch(err){
        res.send({result:-1,msg:'清空失败'})
    }
})
app.get('/', cors(), (req,res)=>{
    res.send('欢迎来到大文件上传')
})

// 合并分片
function mergeChunks(folderPath,fileMd5,nameSuffix,cb){
    fs.readdir(folderPath,(err,data)=>{
        if(!err){
            const pathArr = []
            // console.log(data,'data')
            for (let i = 0; i < data.length; i++) {
                let needPath = data.filter(item => item.split('-')[1].split('.')[0] === String(i))[0]
                pathArr.push(path.join(folderPath,needPath)) 
            }
            const endPathUrl = path.join(staticPath,'finish',`${fileMd5.split('-')[0]}${nameSuffix}`)  // 合并之后的文件路径
            const endWs = fs.createWriteStream(endPathUrl,{flags:'a'})  // 创建可写流,a表示追加内容
            // 将追加添加到文档流封装成一个方法,循环调用
            const addStream = (pathArr)=>{
                let path = pathArr.shift()  // 删除数组的第一个并返回第一个
                const buffer = fs.readFileSync(path)  // 根据file对象的路径获取file对象里的内容
                endWs.write(buffer)  
                fs.unlinkSync(path)  // 追加完就删除文件
                if(pathArr.length > 0){
                    addStream(pathArr)
                }else{
                    endWs.close()
                    cb(endPathUrl)
                }
            }
            addStream(pathArr)
        }
    }) 
}
// 删除目录和子目录
var rmdirSync = (function(){
    function iterator(url,dirs){
        var stat = fs.statSync(url);
        if(stat.isDirectory()){
            dirs.unshift(url);  //收集目录
            inner(url,dirs);
        }else if(stat.isFile()){
            fs.unlinkSync(url);  //直接删除文件
        }
    }
    function inner(path,dirs){
        var arr = fs.readdirSync(path);
        for(var i = 0, el ; el = arr[i++];){
            iterator(path+"/"+el,dirs);
        }
    }
    return function(dir,cb){
        cb = cb || function(){};
        var dirs = [];
        try{
            iterator(dir,dirs);
            for(var i = 0, el ; el = dirs[i++];){
                fs.rmdirSync(el);  //一次性删除所有收集到的目录
            }
            cb()
        }catch(e){
            //如果文件或目录本来就不存在，fs.statSync会报错，不过我们还是当成没有异常发生
            e.code === "ENOENT" ? cb() : cb(e);
        }
    }
})();
// 获取ip地址
function getIPAdress() {
    var interfaces = os.networkInterfaces();
    for (var devName in interfaces) {
        var iface = interfaces[devName];
        for (var i = 0; i < iface.length; i++) {
            var alias = iface[i];
            if (alias.family === 'IPv4' && !alias.internal) {
                return alias.address;
            }
        }
    }
  }

  app.listen(3000, () => {
    console.log(`http://${getIPAdress()}:3000`,'启动成功')
  })