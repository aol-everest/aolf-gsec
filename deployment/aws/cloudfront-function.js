// CloudFront Function for SPA Routing
// This function redirects all requests without file extensions to index.html
// to support client-side routing in React applications

function handler(event) {
    var request = event.request;
    var uri = request.uri;
    
    // Check whether the URI is missing a file name.
    if (uri.endsWith('/')) {
        request.uri += 'index.html';
    } 
    // Check whether the URI is missing a file extension.
    else if (!uri.includes('.')) {
        request.uri = '/index.html';
    }
    
    return request;
} 