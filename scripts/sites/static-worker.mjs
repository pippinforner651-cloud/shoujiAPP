const worker = {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;

    const acceptsHtml = request.headers.get('accept')?.includes('text/html');
    if (!acceptsHtml) return response;

    const shellUrl = new URL('/index.html', request.url);
    return env.ASSETS.fetch(new Request(shellUrl, request));
  },
};

export default worker;

