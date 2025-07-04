/**
 * 测试 CoinGecko API 连接
 */

export async function testCoinGeckoConnection() {
  try {
    console.log('Testing CoinGecko API connection...');
    
    // 测试简单的 ping 请求
    const pingResponse = await fetch('https://api.coingecko.com/api/v3/ping');
    console.log('Ping response status:', pingResponse.status);
    
    if (!pingResponse.ok) {
      throw new Error(`Ping failed: ${pingResponse.status}`);
    }
    
    const pingData = await pingResponse.json();
    console.log('Ping data:', pingData);
    
    // 测试获取比特币价格
    const priceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    console.log('Price response status:', priceResponse.status);
    
    if (!priceResponse.ok) {
      throw new Error(`Price fetch failed: ${priceResponse.status}`);
    }
    
    const priceData = await priceResponse.json();
    console.log('Price data:', priceData);
    
    return {
      success: true,
      ping: pingData,
      price: priceData
    };
  } catch (error) {
    console.error('CoinGecko API test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}