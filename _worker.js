// _worker.js

// ============================================================
// Default configuration values (overridden by env vars)
// ============================================================
let userID = '31d1f008-b9ee-4234-ad81-d0b65971a386';
let proxyIP = '';
let credit = 'CF-Pages-ModsBots';
let dohURL = 'https://8.8.4.4/dns-query';

if (!isValidUUID(userID)) {
  throw new Error('uuid is not valid');
}

// ============================================================
// Main export — Cloudflare Pages / Workers fetch handler
// ============================================================
export default {
  /**
   * @param {Request} request
   * @param {{ UUID?: string, PROXYIP?: string, CREDIT?: string }} env
   * @param {ExecutionContext} ctx
   * @returns {Promise<Response>}
   */
  async fetch(request, env, ctx) {
    try {
      // Read environment variables
      userID = env.UUID || userID;
      proxyIP = env.PROXYIP || proxyIP;
      credit = env.CREDIT || credit;

      if (!isValidUUID(userID)) {
        throw new Error('uuid is not valid');
      }

      const upgradeHeader = request.headers.get('Upgrade') || '';

      if (upgradeHeader.toLowerCase() !== 'websocket') {
        // ---- Normal HTTP requests ----
        const url = new URL(request.url);

        switch (url.pathname) {
          case '/': {
            return handleHomePage(userID);
          }

          case `/${userID}`: {
            return await handleConfigPage(userID, url, credit);
          }

          default:
            return new Response('Not found', { status: 404 });
        }
      } else {
        // ---- WebSocket upgrade ----
        return await vlessOverWSHandler(request);
      }
    } catch (err) {
      return new Response(err.toString(), { status: 500 });
    }
  },
};

// ============================================================
// Home page handler
// ============================================================
function handleHomePage(uuid) {
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to CF Pages Proxy</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background-color: #f0f2f5;
            color: #333;
            text-align: center;
            line-height: 1.6;
        }
        .container {
            background-color: #ffffff;
            padding: 40px 60px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            max-width: 600px;
            width: 90%;
        }
        h1 {
            color: #2c3e50;
            font-size: 2.8em;
            margin-bottom: 20px;
            letter-spacing: 1px;
        }
        p {
            font-size: 1.1em;
            color: #555;
            margin-bottom: 30px;
        }
        .button-container { margin-top: 30px; }
        .button {
            display: inline-block;
            background-color: #007bff;
            color: white;
            padding: 12px 25px;
            border-radius: 8px;
            text-decoration: none;
            font-size: 1.1em;
            transition: background-color 0.3s ease, transform 0.2s ease;
            box-shadow: 0 4px 10px rgba(0, 123, 255, 0.2);
        }
        .button:hover {
            background-color: #0056b3;
            transform: translateY(-2px);
        }
        .footer { margin-top: 40px; font-size: 0.9em; color: #888; }
        .footer a { color: #007bff; text-decoration: none; }
        .footer a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <h1>CF Pages Proxy Online!</h1>
        <p>Your VLESS over WebSocket proxy is up and running. Enjoy secure and efficient connections.</p>
        <div class="button-container">
            <a href="/${uuid}" class="button">Get My VLESS Config</a>
        </div>
        <div class="footer">
            Powered by Cloudflare Pages. For support, contact <a href="https://t.me/modsbots_tech" target="_blank">@modsbots_tech</a>.
        </div>
    </div>
</body>
</html>`;

  return new Response(htmlContent, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// ============================================================
// Config page handler
// ============================================================
async function handleConfigPage(uuid, url, creditName) {
  const hostName = url.hostname;
  const port = url.port || (url.protocol === 'https:' ? 443 : 80);

  const vlessMain = `vless://${uuid}@${hostName}:${port}?encryption=none&security=tls&sni=${hostName}&fp=randomized&type=ws&host=${hostName}&path=%2F%3Fed%3D2048#${creditName}`;

  const clashMetaConfig = `
- type: vless
  name: ${hostName}
  server: ${hostName}
  port: ${port}
  uuid: ${uuid}
  network: ws
  tls: true
  udp: false
  sni: ${hostName}
  client-fingerprint: chrome
  ws-opts:
    path: "/?ed=2048"
    headers:
      host: ${hostName}`;

  const htmlConfigContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VLESS Configuration</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex; flex-direction: column; justify-content: center; align-items: center;
            min-height: 100vh; margin: 0; background-color: #f0f2f5;
            color: #333; text-align: center; line-height: 1.6; padding: 20px;
        }
        .container {
            background-color: #ffffff; padding: 40px 60px; border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); max-width: 800px; width: 90%; margin-bottom: 20px;
        }
        h1 { color: #2c3e50; font-size: 2.5em; margin-bottom: 20px; letter-spacing: 1px; }
        h2 { color: #34495e; font-size: 1.8em; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #eee; padding-bottom: 5px; }
        .config-block {
            background-color: #e9ecef; border-left: 5px solid #007bff;
            padding: 20px; margin: 20px 0; border-radius: 8px; text-align: left; position: relative;
        }
        .config-block pre {
            white-space: pre-wrap; word-wrap: break-word;
            font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
            font-size: 0.95em; line-height: 1.4; color: #36454F;
        }
        .copy-button {
            position: absolute; top: 10px; right: 10px;
            background-color: #28a745; color: white; border: none;
            padding: 8px 15px; border-radius: 5px; cursor: pointer;
            font-size: 0.9em; transition: background-color 0.3s ease;
        }
        .copy-button:hover { background-color: #218838; }
        .copy-button:active { background-color: #1e7e34; }
        .footer { margin-top: 20px; font-size: 0.9em; color: #888; }
        .footer a { color: #007bff; text-decoration: none; }
        .footer a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Your VLESS Configuration</h1>
        <p>Use the configurations below to set up your VLESS client. Click the "Copy" button to easily transfer the settings.</p>

        <h2>VLESS URI (for v2rayN, V2RayNG, etc.)</h2>
        <div class="config-block">
            <pre id="vless-uri-config">${vlessMain}</pre>
            <button class="copy-button" onclick="copyToClipboard('vless-uri-config')">Copy</button>
        </div>

        <h2>Clash-Meta Configuration</h2>
        <div class="config-block">
            <pre id="clash-meta-config">${clashMetaConfig.trim()}</pre>
            <button class="copy-button" onclick="copyToClipboard('clash-meta-config')">Copy</button>
        </div>
    </div>
    <script>
        function copyToClipboard(elementId) {
            const element = document.getElementById(elementId);
            const textToCopy = element.innerText;
            navigator.clipboard.writeText(textToCopy)
                .then(() => alert('Configuration copied to clipboard!'))
                .catch(err => {
                    console.error('Failed to copy: ', err);
                    alert('Failed to copy configuration. Please copy manually.');
                });
        }
    </script>
    <div class="footer">
        Powered by Cloudflare Pages. For support, contact <a href="https://t.me/modsbots_tech" target="_blank">@modsbots_tech</a>.
    </div>
</body>
</html>`;

  return new Response(htmlConfigContent, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// ============================================================
// VLESS over WebSocket handler
// ============================================================
async function vlessOverWSHandler(request) {
  const webSocketPair = new WebSocketPair();
  const [client, webSocket] = Object.values(webSocketPair);

  webSocket.accept();

  let address = '';
  let portWithRandomLog = '';
  const log = (info, event) => {
    console.log(`[${address}:${portWithRandomLog}] ${info}`, event || '');
  };

  const earlyDataHeader = request.headers.get('sec-websocket-protocol') || '';
  const readableWebSocketStream = makeReadableWebSocketStream(webSocket, earlyDataHeader, log);

  let remoteSocketWapper = { value: null };
  let udpStreamWrite = null;
  let isDns = false;

  readableWebSocketStream
    .pipeTo(
      new WritableStream({
        async write(chunk, controller) {
          if (isDns && udpStreamWrite) {
            return udpStreamWrite(chunk);
          }
          if (remoteSocketWapper.value) {
            const writer = remoteSocketWapper.value.writable.getWriter();
            await writer.write(chunk);
            writer.releaseLock();
            return;
          }

          const {
            hasError,
            message,
            portRemote = 443,
            addressRemote = '',
            rawDataIndex,
            vlessVersion = new Uint8Array([0, 0]),
            isUDP,
          } = processVlessHeader(chunk, userID);

          address = addressRemote;
          portWithRandomLog = `${portRemote}--${Math.random()} ${isUDP ? 'udp ' : 'tcp '}`;

          if (hasError) {
            throw new Error(message);
          }

          if (isUDP) {
            if (portRemote === 53) {
              isDns = true;
            } else {
              throw new Error('UDP proxy only enable for DNS which is port 53');
            }
          }

          const vlessResponseHeader = new Uint8Array([vlessVersion[0], 0]);
          const rawClientData = chunk.slice(rawDataIndex);

          if (isDns) {
            const { write } = await handleUDPOutBound(webSocket, vlessResponseHeader, log);
            udpStreamWrite = write;
            udpStreamWrite(rawClientData);
            return;
          }

          handleTCPOutBound(
            remoteSocketWapper,
            addressRemote,
            portRemote,
            rawClientData,
            webSocket,
            vlessResponseHeader,
            log
          );
        },
        close() {
          log(`readableWebSocketStream is close`);
        },
        abort(reason) {
          log(`readableWebSocketStream is abort`, JSON.stringify(reason));
        },
      })
    )
    .catch((err) => {
      log('readableWebSocketStream pipeTo error', err);
    });

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
}

// ============================================================
// TCP outbound handler
// ============================================================
async function handleTCPOutBound(
  remoteSocket,
  addressRemote,
  portRemote,
  rawClientData,
  webSocket,
  vlessResponseHeader,
  log
) {
  // Dynamic import for cloudflare:sockets to avoid build-time issues
  const { connect } = await import('cloudflare:sockets');

  async function connectAndWrite(address, port) {
    const tcpSocket = connect({
      hostname: address,
      port: port,
    });
    remoteSocket.value = tcpSocket;
    log(`connected to ${address}:${port}`);
    const writer = tcpSocket.writable.getWriter();
    await writer.write(rawClientData);
    writer.releaseLock();
    return tcpSocket;
  }

  async function retry() {
    const tcpSocket = await connectAndWrite(proxyIP || addressRemote, portRemote);
    tcpSocket.closed
      .catch((error) => {
        console.log('retry tcpSocket closed error', error);
      })
      .finally(() => {
        safeCloseWebSocket(webSocket);
      });
    remoteSocketToWS(tcpSocket, webSocket, vlessResponseHeader, null, log);
  }

  const tcpSocket = await connectAndWrite(addressRemote, portRemote);

  remoteSocketToWS(tcpSocket, webSocket, vlessResponseHeader, retry, log);
}

// ============================================================
// Create readable stream from WebSocket
// ============================================================
function makeReadableWebSocketStream(webSocketServer, earlyDataHeader, log) {
  let readableStreamCancel = false;
  const stream = new ReadableStream({
    start(controller) {
      webSocketServer.addEventListener('message', (event) => {
        if (readableStreamCancel) {
          return;
        }
        const message = event.data;
        controller.enqueue(message);
      });

      webSocketServer.addEventListener('close', () => {
        safeCloseWebSocket(webSocketServer);
        if (readableStreamCancel) {
          return;
        }
        controller.close();
      });

      webSocketServer.addEventListener('error', (err) => {
        log('webSocketServer has error');
        controller.error(err);
      });

      const { earlyData, error } = base64ToArrayBuffer(earlyDataHeader);
      if (error) {
        controller.error(error);
      } else if (earlyData) {
        controller.enqueue(earlyData);
      }
    },

    pull(controller) {},

    cancel(reason) {
      if (readableStreamCancel) {
        return;
      }
      log(`ReadableStream was canceled, due to ${reason}`);
      readableStreamCancel = true;
      safeCloseWebSocket(webSocketServer);
    },
  });

  return stream;
}

// ============================================================
// Process VLESS header
// ============================================================
function processVlessHeader(vlessBuffer, userID) {
  if (vlessBuffer.byteLength < 24) {
    return {
      hasError: true,
      message: 'invalid data',
    };
  }

  const version = new Uint8Array(vlessBuffer.slice(0, 1));
  let isValidUser = false;
  let isUDP = false;

  if (stringify(new Uint8Array(vlessBuffer.slice(1, 17))) === userID) {
    isValidUser = true;
  }

  if (!isValidUser) {
    return {
      hasError: true,
      message: 'invalid user',
    };
  }

  const optLength = new Uint8Array(vlessBuffer.slice(17, 18))[0];

  const command = new Uint8Array(
    vlessBuffer.slice(18 + optLength, 18 + optLength + 1)
  )[0];

  if (command === 1) {
    // TCP
  } else if (command === 2) {
    isUDP = true;
  } else {
    return {
      hasError: true,
      message: `command ${command} is not support, command 01-tcp,02-udp,03-mux`,
    };
  }

  const portIndex = 18 + optLength + 1;
  const portBuffer = vlessBuffer.slice(portIndex, portIndex + 2);
  const portRemote = new DataView(portBuffer).getUint16(0);

  let addressIndex = portIndex + 2;
  const addressBuffer = new Uint8Array(
    vlessBuffer.slice(addressIndex, addressIndex + 1)
  );

  const addressType = addressBuffer[0];
  let addressLength = 0;
  let addressValueIndex = addressIndex + 1;
  let addressValue = '';

  switch (addressType) {
    case 1: // IPv4
      addressLength = 4;
      addressValue = new Uint8Array(
        vlessBuffer.slice(addressValueIndex, addressValueIndex + addressLength)
      ).join('.');
      break;
    case 2: // Domain
      addressLength = new Uint8Array(
        vlessBuffer.slice(addressValueIndex, addressValueIndex + 1)
      )[0];
      addressValueIndex += 1;
      addressValue = new TextDecoder().decode(
        vlessBuffer.slice(addressValueIndex, addressValueIndex + addressLength)
      );
      break;
    case 3: // IPv6
      addressLength = 16;
      const dataView = new DataView(
        vlessBuffer.slice(addressValueIndex, addressValueIndex + addressLength)
      );
      const ipv6 = [];
      for (let i = 0; i < 8; i++) {
        ipv6.push(dataView.getUint16(i * 2).toString(16));
      }
      addressValue = ipv6.join(':');
      break;
    default:
      return {
        hasError: true,
        message: `invild addressType is ${addressType}`,
      };
  }

  if (!addressValue) {
    return {
      hasError: true,
      message: `addressValue is empty, addressType is ${addressType}`,
    };
  }

  return {
    hasError: false,
    addressRemote: addressValue,
    addressType,
    portRemote,
    rawDataIndex: addressValueIndex + addressLength,
    vlessVersion: version,
    isUDP,
  };
}

// ============================================================
// Remote socket (TCP) --> WebSocket
// ============================================================
async function remoteSocketToWS(remoteSocket, webSocket, vlessResponseHeader, retry, log) {
  let hasIncomingData = false;
  let vlessHeader = vlessResponseHeader;

  await remoteSocket.readable
    .pipeTo(
      new WritableStream({
        start() {},
        async write(chunk, controller) {
          hasIncomingData = true;
          if (webSocket.readyState !== WS_READY_STATE_OPEN) {
            controller.error('webSocket.readyState is not open, maybe close');
          }
          if (vlessHeader) {
            webSocket.send(await new Blob([vlessHeader, chunk]).arrayBuffer());
            vlessHeader = null;
          } else {
            webSocket.send(chunk);
          }
        },
        close() {
          log(`remoteConnection!.readable is close with hasIncomingData is ${hasIncomingData}`);
        },
        abort(reason) {
          console.error(`remoteConnection!.readable abort`, reason);
        },
      })
    )
    .catch((error) => {
      console.error(`remoteSocketToWS has exception `, error.stack || error);
      safeCloseWebSocket(webSocket);
    });

  if (hasIncomingData === false && retry) {
    log(`retry`);
    retry();
  }
}

// ============================================================
// UDP outbound handler (DNS only)
// ============================================================
async function handleUDPOutBound(webSocket, vlessResponseHeader, log) {
  let isVlessHeaderSent = false;

  const transformStream = new TransformStream({
    start(controller) {},
    transform(chunk, controller) {
      for (let index = 0; index < chunk.byteLength;) {
        const lengthBuffer = chunk.slice(index, index + 2);
        const udpPakcetLength = new DataView(lengthBuffer).getUint16(0);
        const udpData = new Uint8Array(
          chunk.slice(index + 2, index + 2 + udpPakcetLength)
        );
        index = index + 2 + udpPakcetLength;
        controller.enqueue(udpData);
      }
    },
    flush(controller) {},
  });

  transformStream.readable
    .pipeTo(
      new WritableStream({
        async write(chunk) {
          const resp = await fetch(dohURL, {
            method: 'POST',
            headers: {
              'content-type': 'application/dns-message',
            },
            body: chunk,
          });
          const dnsQueryResult = await resp.arrayBuffer();
          const udpSize = dnsQueryResult.byteLength;
          const udpSizeBuffer = new Uint8Array([
            (udpSize >> 8) & 0xff,
            udpSize & 0xff,
          ]);
          if (webSocket.readyState === WS_READY_STATE_OPEN) {
            log(`doh success and dns message length is ${udpSize}`);
            if (isVlessHeaderSent) {
              webSocket.send(
                await new Blob([udpSizeBuffer, dnsQueryResult]).arrayBuffer()
              );
            } else {
              webSocket.send(
                await new Blob([vlessResponseHeader, udpSizeBuffer, dnsQueryResult]).arrayBuffer()
              );
              isVlessHeaderSent = true;
            }
          }
        },
      })
    )
    .catch((error) => {
      log('dns udp has error' + error);
    });

  const writer = transformStream.writable.getWriter();

  return {
    write(chunk) {
      writer.write(chunk);
    },
  };
}

// ============================================================
// Utility functions
// ============================================================

function base64ToArrayBuffer(base64Str) {
  if (!base64Str) {
    return { earlyData: null, error: null };
  }
  try {
    base64Str = base64Str.replace(/-/g, '+').replace(/_/g, '/');
    const decode = atob(base64Str);
    const arryBuffer = Uint8Array.from(decode, (c) => c.charCodeAt(0));
    return { earlyData: arryBuffer.buffer, error: null };
  } catch (error) {
    return { earlyData: null, error };
  }
}

function isValidUUID(uuid) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

const WS_READY_STATE_OPEN = 1;
const WS_READY_STATE_CLOSING = 2;

function safeCloseWebSocket(socket) {
  try {
    if (
      socket.readyState === WS_READY_STATE_OPEN ||
      socket.readyState === WS_READY_STATE_CLOSING
    ) {
      socket.close();
    }
  } catch (error) {
    console.error('safeCloseWebSocket error', error);
  }
}

const byteToHex = [];
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).slice(1));
}

function unsafeStringify(arr, offset = 0) {
  return (
    byteToHex[arr[offset + 0]] +
    byteToHex[arr[offset + 1]] +
    byteToHex[arr[offset + 2]] +
    byteToHex[arr[offset + 3]] +
    '-' +
    byteToHex[arr[offset + 4]] +
    byteToHex[arr[offset + 5]] +
    '-' +
    byteToHex[arr[offset + 6]] +
    byteToHex[arr[offset + 7]] +
    '-' +
    byteToHex[arr[offset + 8]] +
    byteToHex[arr[offset + 9]] +
    '-' +
    byteToHex[arr[offset + 10]] +
    byteToHex[arr[offset + 11]] +
    byteToHex[arr[offset + 12]] +
    byteToHex[arr[offset + 13]] +
    byteToHex[arr[offset + 14]] +
    byteToHex[arr[offset + 15]]
  ).toLowerCase();
}

function stringify(arr, offset = 0) {
  const uuid = unsafeStringify(arr, offset);
  if (!isValidUUID(uuid)) {
    throw TypeError('Stringified UUID is invalid');
  }
  return uuid;
}
