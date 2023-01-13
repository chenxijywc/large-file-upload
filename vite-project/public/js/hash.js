self.importScripts("spark-md5.min.js")

self.onmessage = e =>{
    var file = e.data.file
    var sparkMD52 = new self.SparkMD5.ArrayBuffer()
    var reader = new FileReader()
    reader.readAsArrayBuffer(file)
    reader.onload = (event) => {
      var target = event.target
      var str = target.result
      sparkMD52.append(str)
      var md = sparkMD52.end() 
      self.postMessage({name:"succee",data:md})
      self.close()  
    }
    reader.onerror = (err) => {
      self.postMessage({name:"error",data:err})
      self.close()
    }
}