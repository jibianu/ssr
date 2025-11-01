

export const environment = {
  production: false,
  //  RECOMMENDED: Use production backend (works with SSR, no SSL/CORS issues)
 // apiUrl: 'https://coursebackend.oilandgasclub.com/',
  //  Local backend (requires SSL certificate, CORS configuration, and backend running)
   apiUrl: 'https://localhost:52045/',
  // apiUrl: 'http://localhost:52045/',  // Use HTTP if SSL is an issue
  // apiUrl: 'http://coursebackend:8080/',  // Docker container name
  
  seoUrl: 'https://oilandgasclub.com/',
  imgUrl: 'https://via.placeholder.com/468x300'
};


// function (browser or server?) => enviroment
// function (dev or prod) => enviroment

// function (browser or server?, dev or prod)  => final enviroment