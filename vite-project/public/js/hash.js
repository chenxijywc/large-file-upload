self.importScripts("spark-md5.min.js")

self.onmessage = e =>{
  var file = e.data.file
  //切片
  //获取切片数量chunknum，文件总大小file.size，切片大小chunkSize
  var chunkSize = 1024*1024*5  //每个切片的大小定位5m
  var chunknum = Math.ceil(file.size / chunkSize)
  var sparkMD5 = new SparkMD5.ArrayBuffer()
  var str = ''
  //利用文件首尾分片的md5拼接作为整个文件md5
  for (var i = 0; i < chunknum; i++) {
    var reader = new FileReader()
    var park = file.slice(i * chunkSize, (i + 1) * chunkSize)
    if (i == 0) {
      reader.readAsArrayBuffer(park)
      reader.onload = (event) => {
        str = event.target.result.slice(0, 1) + str
      }
    }
    if (i == chunknum - 1) {
      reader.readAsArrayBuffer(park)
      reader.onload = (event) => {
        //获取第一片和最后一片切片的首字母加密MD5
        str = event.target.result.slice(0, 1) + str
        sparkMD5.append(str)
        var md = sparkMD5.end()
        self.postMessage({name:"succee",data:md})
        self.close()
      }
    }
  }
  reader.onerror = (err) => {
    self.postMessage({name:"error",data:err})
    self.close()
  }
}