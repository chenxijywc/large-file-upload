import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

interface HttpResponse<T=void> {
  data: T
  result:number
  msg:string
}
let number = 2
number = '2'

// 设置请求头
let myBaseURL = 'http://192.168.8.72:3000'
// let { protocol,hostname,port } = window.location  //location对象里的协议地址端口
// protocol !== "http:" ? myBaseURL =  protocol + '//' + hostname + (port ? ':'+port : '') : ''  //协议地址端口动态拼接
axios.defaults.baseURL = myBaseURL   

// 创建axios实例
const service = axios.create({
    baseURL: myBaseURL, // 请求头
    timeout: 15000 // 请求超时时间
  })

// 请求拦截
service.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    return config;
  },(error) => {
    return Promise.reject(error);
  }
);

// 响应拦截
service.interceptors.response.use(
  (response: AxiosResponse<HttpResponse>) => {
    // 返回的result不是1就用提示框提示后端返回的报错提示
    // response.data.result !== 1 ? Message.error({content: response.data.message || 'Error',duration: 5 * 1000}) : ''
    return response.data
  },
  (error) => {
    // Message.error({content: error.msg,duration: 5 * 1000});
    return Promise.reject(error);
  }
);

export default service
