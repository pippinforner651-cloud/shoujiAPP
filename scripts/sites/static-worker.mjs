const worker = {
  async fetch(request, env) {
    if (new URL(request.url).pathname === '/__health') {
      return new Response('E23_SITES_WORKER_OK', {
        status: 200,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;

    const acceptsHtml = request.headers.get('accept')?.includes('text/html');
    if (!acceptsHtml) return response;

    const shellUrl = new URL('/index.html', request.url);
    return env.ASSETS.fetch(new Request(shellUrl, request));
  },
};

export default worker;
