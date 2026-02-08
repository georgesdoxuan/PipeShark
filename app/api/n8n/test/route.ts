import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    checks: {}
  };

  // Check 1: Environment variable
  const url = process.env.N8N_WEBHOOK_URL;
  diagnostics.checks.envVar = {
    exists: !!url,
    value: url ? (url.length > 50 ? url.substring(0, 50) + '...' : url) : 'NOT SET',
    fullLength: url?.length || 0
  };

  if (!url) {
    return NextResponse.json({
      error: 'N8N_WEBHOOK_URL is not set',
      diagnostics
    }, { status: 500 });
  }

  // Check 2: URL format
  try {
    const urlObj = new URL(url);
    diagnostics.checks.urlFormat = {
      valid: true,
      protocol: urlObj.protocol,
      host: urlObj.host,
      pathname: urlObj.pathname
    };
  } catch (e: any) {
    diagnostics.checks.urlFormat = {
      valid: false,
      error: e.message
    };
    return NextResponse.json({
      error: 'Invalid URL format',
      diagnostics
    }, { status: 500 });
  }

  // Check 3: Try to make the request
  try {
    const testUrl = `${url}?test=true&timestamp=${Date.now()}`;
    diagnostics.checks.request = {
      url: testUrl,
      method: 'GET',
      attempting: true
    };

    const response = await axios.get(testUrl, {
      timeout: 5000,
      validateStatus: () => true
    });

    diagnostics.checks.request.result = {
      success: true,
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      headers: response.headers
    };

    return NextResponse.json({
      success: true,
      message: 'Webhook is reachable',
      diagnostics
    });
  } catch (error: any) {
    diagnostics.checks.request.result = {
      success: false,
      error: {
        message: error.message,
        code: error.code,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : null,
        request: error.request ? {
          path: error.config?.url
        } : null
      }
    };

    return NextResponse.json({
      error: 'Failed to reach webhook',
      diagnostics
    }, { status: 500 });
  }
}
