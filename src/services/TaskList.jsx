// src/components/TaskList.jsx
import { useEffect, useState } from "react";
import { fetchTasks } from "../services/tasksService";

export default function TaskList() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    fetchTasks().then(setTasks);
  }, []);

  return (
    <div>
      {tasks.map(task => (
        <div key={task.id}>
          <h3>{task.title}</h3>
          <p>{task.description}</p>
          <p>Due: {task.dueDate}</p>
        </div>
      ))}
    </div>
  );
}