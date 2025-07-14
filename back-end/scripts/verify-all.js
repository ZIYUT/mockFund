const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

// 读取部署信息
const deployment = require("../deployments/sepolia-deployment.json");

// 需要验证的合约及其构造参数
const contracts = [
  {
    name: "MockFund",
    address: deployment.contracts.MockFund,
    args: [
      "Mock Fund Coin",
      "MFC",
      deployment.deployer,
      deployment.configuration.managementFeeRate,
      deployment.contracts.ChainlinkPriceOracle,
      deployment.contracts.UniswapIntegration
    ]
  },
  {
    name: "ChainlinkPriceOracle",
    address: deployment.contracts.ChainlinkPriceOracle,
    args: [deployment.deployer]
  },
  {
    name: "UniswapIntegration",
    address: deployment.contracts.UniswapIntegration,
    args: [deployment.deployer, deployment.contracts.ChainlinkPriceOracle]
  },
  // 你可以在这里继续添加其它合约，如 MockUSDC、MockTokens 等
];

// 验证函数
function verify(address, args) {
  const cmd = [
    "npx hardhat verify --network sepolia",
    address,
    ...args.map(a => (typeof a === "string" ? `"${a}"` : a))
  ].join(" ");
  console.log(`\n[VERIFY] ${cmd}\n`);
  try {
    execSync(cmd, { stdio: "inherit" });
  } catch (e) {
    console.error(`[ERROR] 验证失败: ${address}`);
  }
}

// 主流程
for (const c of contracts) {
  verify(c.address, c.args);
}