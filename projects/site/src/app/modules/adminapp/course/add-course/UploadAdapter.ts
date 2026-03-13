import { environment } from './../../../../../environments/environment';
// import { HttpClient } from "@angular/common/http";

// export class UploadAdapter {
//     constructor(
//         private loader,
//         private http: HttpClient,
//     ) {
//     }
//     //the uploadFile method use to upload image to your server
//     uploadFile(file) {
//         let url = 'https://blog.onospot.com:81/api/Blog/UploadImage';
//         let formData: FormData = new FormData();
//         formData.append('file', file);
//         return this.http.post(url, formData);
//     }
//     //implement the upload 
//     upload() {
//         let upload = new Promise((resolve, reject) => {
//             this.loader['file'].then(
//                 (data) => {
//                     this.uploadFile(data)
//                         .subscribe(
//                             (result) => {
//                                 resolve({ default: result['url'] });
//                             },
//                             (error) => {
//                                 reject(error);
//                             }
//                         );
//                 }
//             );
//         });
//         return upload;
//     }
//     abort() {
//         console.log("abort")
//     }
// }


export class MyUploadAdapter {
  public loader: any;
  public url: string;
  public xhr: XMLHttpRequest;
  public token: string;

  constructor(loader) {
    this.loader = loader;

    // change "environment.BASE_URL" key and API path
    this.url = `${environment.apiUrl}page/Course/UploadImage`;

    // change "token" value with your token
    this.token = localStorage.getItem("token");
  }

  upload() {
    return new Promise(async (resolve, reject) => {
      this.loader.file.then((file) => {
        this._initRequest();
        this._initListeners(resolve, reject, file);
        this._sendRequest(file);
      });
    });
  }

  abort() {
    if (this.xhr) {
      this.xhr.abort();
    }
  }

  _initRequest() {
    const xhr = (this.xhr = new XMLHttpRequest());
    xhr.open("POST", this.url, true);

    // change "Authorization" header with your header

    xhr.responseType = "json";
  }

  _initListeners(resolve, reject, file) {
    const xhr = this.xhr;
    const loader = this.loader;
    const genericErrorText = "Couldn't upload file:" + ` ${file.name}.`;

    xhr.addEventListener("error", () => reject(genericErrorText));
    xhr.addEventListener("abort", () => reject());

    xhr.addEventListener("load", () => {
      const response = xhr.response;

      if (!response || response.error) {
        return reject(
          response && response.error ? response.error.message : genericErrorText
        );
      }

      // change "response.data.fullPaths[0]" with image URL
      resolve({
        default: response.url,
      });
    });

    if (xhr.upload) {
      xhr.upload.addEventListener("progress", (evt) => {
        if (evt.lengthComputable) {
          loader.uploadTotal = evt.total;
          loader.uploaded = evt.loaded;
        }
      });
    }
  }

  _sendRequest(file) {
    const data = new FormData();

    // change "attachments" key
    data.append("file", file);

    this.xhr.send(data);
  }
}