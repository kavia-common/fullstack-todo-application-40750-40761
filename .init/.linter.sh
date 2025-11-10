#!/bin/bash
cd /home/kavia/workspace/code-generation/fullstack-todo-application-40750-40761/frontend_react
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

