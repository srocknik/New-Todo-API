const { format } = require("date-fns");
const isValid = require("date-fns/isValid");
const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializeServerAndDb = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Listen To Port http://localhost:3000");
    });
  } catch (e) {
    console.log(e.message);
    process.exit(1);
  }
};

initializeServerAndDb();

const convertSnakeCaseIntoCamelCase = (eachItem) => {
  return {
    id: eachItem.id,
    todo: eachItem.todo,
    category: eachItem.category,
    priority: eachItem.priority,
    status: eachItem.status,
    dueDate: eachItem.due_date,
  };
};

const hasStatusProperty = (dbObject) => dbObject.status !== undefined;

const hasPriorityProperty = (dbObject) => dbObject.priority !== undefined;

const hasSearchQProperty = (dbObject) => dbObject.search_q !== undefined;

const hasStatusAndPriorityProperty = (dbObject) =>
  dbObject.priority !== undefined && dbObject.status !== undefined;

const hasCategoryProperty = (dbObject) => dbObject.category !== undefined;

const hasCategoryAndStatusProperty = (dbObject) =>
  dbObject.status !== undefined && dbObject.category !== undefined;

const hasCategoryAndPriorityProperty = (dbObject) =>
  dbObject.priority !== undefined && dbObject.category !== undefined;

const todoStatusList = ["TO DO", "DONE", "IN PROGRESS"];
const todoPriorityList = ["HIGH", "LOW", "MEDIUM"];
const todoCategoryList = ["WORK", "HOME", "LEARNING"];

//get Todos API
app.get("/todos/", async (request, response) => {
  const {
    search_q,
    id,
    todo,
    category,
    priority,
    status,
    dueDate,
  } = request.query;
  let getTodosQuery;
  switch (true) {
    case hasStatusAndPriorityProperty(request.query):
      getTodosQuery = `
                SELECT * 
                FROM 
                    todo 
                WHERE
                    priority = '${priority}'
                    AND status = '${status}';
            `;
      const todo = await db.all(getTodosQuery);
      response.send(
        todo.map((eachItem) => convertSnakeCaseIntoCamelCase(eachItem))
      );

      break;
    case hasStatusProperty(request.query):
      if (todoStatusList.includes(request.query.status)) {
        getTodosQuery = `
                SELECT * 
                FROM 
                    todo 
                WHERE 
                    status = '${status}';
            `;
        const statusTodo = await db.all(getTodosQuery);
        response.send(
          statusTodo.map((eachItem) => convertSnakeCaseIntoCamelCase(eachItem))
        );
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;
    case hasPriorityProperty(request.query):
      if (todoPriorityList.includes(request.query.priority)) {
        getTodosQuery = `
                SELECT * 
                FROM 
                    todo 
                WHERE 
                    priority = '${priority}';
                `;
        const priorityTodo = await db.all(getTodosQuery);
        response.send(
          priorityTodo.map((eachItem) =>
            convertSnakeCaseIntoCamelCase(eachItem)
          )
        );
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;
    case hasCategoryAndStatusProperty(request.query):
      getTodosQuery = `
                SELECT * 
                FROM 
                    todo 
                WHERE
                    category = '${category}'
                    AND status = '${status}';
            `;
      const statusCatTodo = await db.get(getTodosQuery);
      response.send(
        statusCatTodo.map((eachItem) => convertSnakeCaseIntoCamelCase(eachItem))
      );
      break;
    case hasCategoryProperty(request.query):
      if (todoCategoryList.includes(request.query.category)) {
        getTodosQuery = `
                SELECT * 
                FROM 
                    todo 
                WHERE 
                    category = '${category}';
            `;
        const categoryTodo = await db.all(getTodosQuery);
        response.send(
          categoryTodo.map((eachItem) =>
            convertSnakeCaseIntoCamelCase(eachItem)
          )
        );
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
    case hasCategoryAndPriorityProperty(request.query):
      getTodosQuery = `
                SELECT * 
                FROM 
                    todo 
                WHERE
                    priority = '${priority}'
                    AND category = '${category}';
            `;
      const categoryPriorityTodo = await db.all(getTodosQuery);
      response.send(
        categoryPriorityTodo.map((eachItem) =>
          convertSnakeCaseIntoCamelCase(eachItem)
        )
      );
      break;
    case hasSearchQProperty(request.query):
      getTodosQuery = `
                SELECT * 
                FROM 
                    todo 
                WHERE 
                    todo LIKE '%${search_q}%';
            `;
      const searchTodo = await db.all(getTodosQuery);
      response.send(
        searchTodo.map((eachItem) => convertSnakeCaseIntoCamelCase(eachItem))
      );
      break;
    default:
      getTodosQuery = `
            SELECT *
            FROM 
                todo 
            ORDER BY 
                id;
        `;
      const todoArray = await db.all(getTodosQuery);
      response.send(todoArray);
      break;
  }
});

//get todo API
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
        SELECT 
            * 
        FROM 
            todo 
        WHERE 
            id = ${todoId};
    `;
  const todo = await db.get(getTodoQuery);
  response.send(convertSnakeCaseIntoCamelCase(todo));
});

//get DateTodo API
app.get("/agenda/", async (request, response) => {
  const { dueDate } = request.query;
  if (isValid(new Date(request.query.dueDate))) {
    const getTodoDateQuery = `
    SELECT * 
    FROM 
        todo 
    WHERE 
        due_date = '${dueDate}';
  `;
    const dateTodo = await db.get(getTodoDateQuery);
    response.send(dateTodo);
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

//post todo API
app.post("/todos/", async (request, response) => {
  const { id, todo, category, priority, status, dueDate } = request.body;
  if (!todoStatusList.includes(request.body.status)) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (!todoPriorityList.includes(request.body.priority)) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (!todoCategoryList.includes(request.body.category)) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else if (!isValid(new Date(request.body.dueDate))) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    const addTodoQuery = `
    INSERT INTO 
        todo (id,todo,category,priority,status,due_date)
    VALUES (
        ${id},
        '${todo}',
        '${category}',
        '${priority}',
        '${status}',
        '${dueDate}'
    );
  `;
    const addTodo = await db.run(addTodoQuery);
    response.send("Todo Successfully Added");
  }
});

//put todo API
app.put("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;
  let updateColumn = "";
  const requestBody = request.body;
  switch (true) {
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
    case requestBody.status !== undefined:
      if (todoStatusList.includes(requestBody.status)) {
        updateColumn = "Status";
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;
    case requestBody.priority !== undefined:
      if (todoPriorityList.includes(requestBody.priority)) {
        updateColumn = "Priority";
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;
    case requestBody.category !== undefined:
      if (todoCategoryList.includes(requestBody.category)) {
        updateColumn = "Category";
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
  }

  const previousTodoQuery = `
    SELECT * 
    FROM 
        todo 
    WHERE 
        id = ${todoId};
  `;
  const previousTodo = await db.get(previousTodoQuery);
  const {
    todo = previousTodo.todo,
    status = previousTodo.status,
    priority = previousTodo.priority,
    category = previousTodo.category,
  } = request.body;

  const updateQuery = `
    UPDATE 
        todo 
    SET 
        todo = '${todo}',
        priority = '${priority}',
        status = '${status}',
        category = '${category}'
    WHERE 
        id = ${todoId};
  `;
  const updateTodo = await db.run(updateQuery);
  response.send(`${updateColumn} Updated`);
});

//delete todo API
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
        DELETE  
        FROM 
            todo 
        WHERE 
            id = ${todoId};
    `;
  const deleteTodo = await db.get(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
