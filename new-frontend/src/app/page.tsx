'use client';

import { useState } from 'react';

export default function Home() {
  const [testState, setTestState] = useState(0);

  const handleClick = () => {
    setTestState(prev => prev + 1);
    alert(`按钮点击测试成功！点击次数: ${testState + 1}`);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">MockFund 投资平台 (调试版)</h1>
              <p className="text-sm text-gray-600">测试按钮交互功能</p>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">点击次数: {testState}</span>
              <button
                onClick={handleClick}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                测试按钮
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Test Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">按钮功能测试</h2>
            <div className="space-y-4">
              <button
                onClick={() => alert('按钮1点击成功！')}
                className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                测试按钮 1
              </button>
              
              <button
                onClick={() => alert('按钮2点击成功！')}
                className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                测试按钮 2
              </button>
              
              <button
                onClick={() => {
                  const input = prompt('请输入一些文字:');
                  if (input) {
                    alert(`您输入了: ${input}`);
                  }
                }}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                交互测试按钮
              </button>
            </div>
          </div>
          
          {/* Navigation */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">页面导航</h2>
            <div className="space-y-4">
               <a
                 href="/web3"
                 className="block w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-center"
               >
                 Web3 功能页面
               </a>
             </div>
            
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-2">故障排除</h3>
              <p className="text-sm text-yellow-700">
                如果按钮仍然无法点击，请检查浏览器控制台是否有错误信息，
                或查看 TROUBLESHOOTING.md 文件获取详细的故障排除指南。
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
