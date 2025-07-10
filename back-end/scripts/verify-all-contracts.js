const { run } = require("hardhat");

async function main() {
  console.log("🔍 开始全面验证所有合约到 Etherscan...");

  // 所有合约地址
  const contracts = {
    MockUSDC: "0x3664cB1F94442d995f9Ae62062CB26f5A77F58CB",
    MockFund: "0x92053436b6D0758EcFb765C86a71b2dC4228DEa0",
    FundShareToken: "0xA7b9E425e9D2A5c9E484B45c15bc44F4b9fB2842",
    ChainlinkPriceOracle: "0x5FCD8EbE1B61e7037002cDc33dBCAA91c7AeD5c0",
    UniswapIntegration: "0x427f38fCA385A1C57e6b4995474457939CD03aAF",
    MockTokensFactory: "0xF789421d1ed0D65c65aa076CB119bfBc028f554D",
    WETH: "0xA07EA61f3401eD18d333D47C3bC860070df39205",
    WBTC: "0x29371fc64Fe735Df95940D83aD5E9a8053804709",
    LINK: "0xE9235b4915D8248526895994d93F6d4c06B0dABb",
    DAI: "0x4c094e79fca22E0ec335015d65E9B1DcED8EE7Cf"
  };

  const deployerAddress = "0x87156d3C8Ad7368855FF7E688f3ec70A1aB995d5";

  // 验证配置
  const verificationConfig = [
    {
      name: "MockUSDC",
      address: contracts.MockUSDC,
      args: [deployerAddress],
      contract: "contracts/MockUSDC.sol:MockUSDC"
    },
    {
      name: "MockTokensFactory", 
      address: contracts.MockTokensFactory,
      args: [deployerAddress],
      contract: "contracts/MockTokens.sol:MockTokensFactory"
    },
    {
      name: "WETH",
      address: contracts.WETH,
      args: [deployerAddress],
      contract: "contracts/MockTokens.sol:MockWETH"
    },
    {
      name: "WBTC",
      address: contracts.WBTC,
      args: [deployerAddress],
      contract: "contracts/MockTokens.sol:MockWBTC"
    },
    {
      name: "LINK",
      address: contracts.LINK,
      args: [deployerAddress],
      contract: "contracts/MockTokens.sol:MockLINK"
    },
    {
      name: "DAI",
      address: contracts.DAI,
      args: [deployerAddress],
      contract: "contracts/MockTokens.sol:MockDAI"
    },
    {
      name: "ChainlinkPriceOracle",
      address: contracts.ChainlinkPriceOracle,
      args: [deployerAddress],
      contract: "contracts/ChainlinkPriceOracle.sol:ChainlinkPriceOracle"
    },
    {
      name: "UniswapIntegration",
      address: contracts.UniswapIntegration,
      args: [deployerAddress, contracts.ChainlinkPriceOracle],
      contract: "contracts/UniswapIntegration.sol:UniswapIntegration"
    },
    {
      name: "FundShareToken",
      address: contracts.FundShareToken,
      args: ["MockFund Share Token", "MFC", contracts.MockFund],
      contract: "contracts/FundShareToken.sol:FundShareToken"
    },
    {
      name: "MockFund",
      address: contracts.MockFund,
      args: [
        "MockFund Share Token",
        "MFC",
        deployerAddress,
        100, // managementFeeRate
        contracts.ChainlinkPriceOracle,
        contracts.UniswapIntegration
      ],
      contract: "contracts/MockFund.sol:MockFund"
    }
  ];

  const verifiedContracts = [];
  const failedContracts = [];

  for (let i = 0; i < verificationConfig.length; i++) {
    const config = verificationConfig[i];
    console.log(`\n${i + 1}️⃣ 验证 ${config.name}...`);
    
    try {
      await run("verify:verify", {
        address: config.address,
        constructorArguments: config.args,
        contract: config.contract
      });
      console.log(`✅ ${config.name} 验证成功`);
      verifiedContracts.push(config.name);
    } catch (error) {
      if (error.message.includes("already verified") || error.message.includes("Already Verified")) {
        console.log(`✅ ${config.name} 已经验证过了`);
        verifiedContracts.push(config.name);
      } else {
        console.log(`❌ ${config.name} 验证失败:`, error.message);
        failedContracts.push({ name: config.name, error: error.message });
      }
    }
  }

  // 输出验证结果汇总
  console.log("\n" + "=".repeat(50));
  console.log("🎉 验证结果汇总");
  console.log("=".repeat(50));
  
  console.log("\n✅ 成功验证的合约:");
  verifiedContracts.forEach((name, index) => {
    console.log(`  ${index + 1}. ${name}`);
  });

  if (failedContracts.length > 0) {
    console.log("\n❌ 验证失败的合约:");
    failedContracts.forEach((contract, index) => {
      console.log(`  ${index + 1}. ${contract.name}: ${contract.error}`);
    });
  }

  console.log("\n📋 所有合约地址:");
  Object.entries(contracts).forEach(([name, address]) => {
    console.log(`  ${name}: ${address}`);
  });

  console.log("\n🔗 Etherscan 链接:");
  Object.entries(contracts).forEach(([name, address]) => {
    console.log(`  ${name}: https://sepolia.etherscan.io/address/${address}#code`);
  });

  console.log("\n" + "=".repeat(50));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 