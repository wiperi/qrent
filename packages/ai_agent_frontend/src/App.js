import React, { useState } from "react";
import './App.css';
import Questionnaire from './Questionnaire';
import axios from 'axios';

export default function App() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData) => {
    setLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:8000/surveys", 
        formData,
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
          timeout: 8000,
        }
      );

      console.log("后端返回结果：", response.data.dify);
      alert("提交成功！");
    } catch (error) {
      console.error("提交出错：", error);
      if (error.response) {
        alert(`提交失败：${error.response.status} - ${error.response.data}`);
      } else if (error.request) {
        alert("服务器未响应，请稍后重试。");
      } else {
        alert("请求出错，请检查网络连接。");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header className="App-header">
        <h1>Qrent AI 租房助手</h1>
        <p>智能问卷，帮您找到理想房源</p>
      </header>
      
      <main>
        <Questionnaire onSubmit={handleSubmit} />
        {loading && <p style={{ color: "#667eea" }}>正在提交，请稍候...</p>}
      </main>
    </div>
  );
}



