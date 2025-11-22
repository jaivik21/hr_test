module.exports = {
  apps: [
    {
      name: "Prod_Interview_Tool",
      script: "/home/azureuser/Interview_Tool/prod/ai_foloup_hr_backend_v2/app/main.py",
      args: ["runserver", "0.0.0.0:8000"],
      exec_mode: "fork",
      instances: 1,
      wait_ready: true,
      autorestart: true,
      max_restarts: 5,
      interpreter: "/usr/bin/python3"
    }
  ]
};