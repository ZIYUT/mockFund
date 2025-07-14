import { ethers } from 'ethers';

export interface PermitSignature {
  v: number;
  r: string;
  s: string;
  deadline: number;
}

/**
 * 生成ERC20Permit签名
 * @param tokenAddress 代币合约地址
 * @param owner 代币所有者地址
 * @param spender 被授权者地址
 * @param value 授权金额
 * @param deadline 过期时间
 * @param walletClient wagmi的walletClient
 * @returns Permit签名
 */
export async function generatePermitSignature(
  tokenAddress: string,
  owner: string,
  spender: string,
  value: string,
  deadline: number,
  walletClient: unknown
): Promise<PermitSignature> {
  // ERC20Permit的domain separator
  const domain = {
    name: 'Mock USD Coin',
    version: '1',
    chainId: 11155111, // Sepolia
    verifyingContract: tokenAddress,
  };

  // ERC20Permit的types
  const types = {
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  };

  // 获取当前nonce
  const tokenContract = new ethers.Contract(
    tokenAddress,
    ['function nonces(address owner) view returns (uint256)'],
    walletClient.transport
  );
  const nonce = await tokenContract.nonces(owner);

  // 创建消息
  const message = {
    owner,
    spender,
    value,
    nonce: nonce.toString(),
    deadline: deadline.toString(),
  };

  // 生成签名
  const signature = await walletClient.signTypedData({
    domain,
    types,
    primaryType: 'Permit',
    message,
  });

  // 解析签名
  const sig = ethers.splitSignature(signature);

  return {
    v: sig.v,
    r: sig.r,
    s: sig.s,
    deadline,
  };
}

/**
 * 检查permit是否过期
 * @param deadline 过期时间
 * @returns 是否过期
 */
export function isPermitExpired(deadline: number): boolean {
  return Math.floor(Date.now() / 1000) > deadline;
}

/**
 * 创建permit过期时间（默认20分钟后过期）
 * @param minutesFromNow 从现在开始的分钟数
 * @returns 过期时间戳
 */
export function createPermitDeadline(minutesFromNow: number = 20): number {
  return Math.floor(Date.now() / 1000) + (minutesFromNow * 60);
} 