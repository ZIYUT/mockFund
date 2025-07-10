const { exec } = require('child_process');
const path = require('path');

// 测试文件列表
const testFiles = [
  'test/EnhancedFundTest.js',
  'test/NAVCalculationTest.js'
];

// 测试选项
const testOptions = {
  'all': '运行所有测试',
  'enhanced': '运行增强功能测试',
  'nav': '运行净值计算测试',
  'help': '显示帮助信息'
};

function showHelp() {
  console.log('🧪 MockFund 测试运行器');
  console.log('========================');
  console.log('');
  console.log('使用方法:');
  console.log('  node scripts/run-tests.js [选项]');
  console.log('');
  console.log('选项:');
  Object.entries(testOptions).forEach(([key, description]) => {
    console.log(`  ${key.padEnd(10)} - ${description}`);
  });
  console.log('');
  console.log('示例:');
  console.log('  node scripts/run-tests.js all');
  console.log('  node scripts/run-tests.js enhanced');
  console.log('  node scripts/run-tests.js nav');
}

function runTest(testFile, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 运行 ${description}...`);
    console.log(`📁 测试文件: ${testFile}`);
    console.log('⏳ 正在执行...\n');

    const command = `npx hardhat test ${testFile}`;
    
    const child = exec(command, { cwd: path.join(__dirname, '..') });
    
    child.stdout.on('data', (data) => {
      process.stdout.write(data);
    });
    
    child.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${description} 测试完成`);
        resolve();
      } else {
        console.log(`\n❌ ${description} 测试失败 (退出码: ${code})`);
        reject(new Error(`测试失败，退出码: ${code}`));
      }
    });
    
    child.on('error', (error) => {
      console.log(`\n❌ 执行测试时出错: ${error.message}`);
      reject(error);
    });
  });
}

async function runAllTests() {
  console.log('🧪 运行所有测试...\n');
  
  try {
    for (const testFile of testFiles) {
      const description = testFile.includes('Enhanced') ? '增强功能测试' : '净值计算测试';
      await runTest(testFile, description);
    }
    
    console.log('\n🎉 所有测试完成！');
  } catch (error) {
    console.log('\n❌ 部分测试失败');
    process.exit(1);
  }
}

async function runSpecificTest(testType) {
  let testFile, description;
  
  switch (testType) {
    case 'enhanced':
      testFile = 'test/EnhancedFundTest.js';
      description = '增强功能测试';
      break;
    case 'nav':
      testFile = 'test/NAVCalculationTest.js';
      description = '净值计算测试';
      break;
    default:
      console.log('❌ 未知的测试类型');
      showHelp();
      return;
  }
  
  try {
    await runTest(testFile, description);
    console.log('\n🎉 测试完成！');
  } catch (error) {
    console.log('\n❌ 测试失败');
    process.exit(1);
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const option = args[0] || 'help';
  
  switch (option) {
    case 'all':
      await runAllTests();
      break;
    case 'enhanced':
      await runSpecificTest('enhanced');
      break;
    case 'nav':
      await runSpecificTest('nav');
      break;
    case 'help':
    default:
      showHelp();
      break;
  }
}

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.log('❌ 未处理的Promise拒绝:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.log('❌ 未捕获的异常:', error);
  process.exit(1);
});

// 运行主函数
main().catch((error) => {
  console.log('❌ 运行测试时出错:', error);
  process.exit(1);
}); 