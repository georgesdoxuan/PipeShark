'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { ArrowLeft, Plus, Trash2, Loader2, ListTodo, Circle, PlayCircle, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

type TodoStatus = 'todo' | 'doing' | 'done';

interface Todo {
  id: string;
  title: string;
  status: TodoStatus;
  createdAt: string;
}

const PIPELINE: { status: TodoStatus; label: string; icon: typeof Circle }[] = [
  { status: 'todo', label: 'To Do', icon: Circle },
  { status: 'doing', label: 'Doing', icon: PlayCircle },
  { status: 'done', label: 'Done', icon: CheckCircle },
];

export default function TodoPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchTodos() {
    try {
      const res = await fetch('/api/todos');
      if (res.ok) {
        const data = await res.json();
        setTodos(Array.isArray(data) ? data : []);
      } else {
        setTodos([]);
      }
    } catch {
      setTodos([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTodos();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title || adding) return;

    setAdding(true);
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        const todo = await res.json();
        setTodos((prev) => [todo, ...prev]);
        setNewTitle('');
      }
    } catch {
      // Ignore
    } finally {
      setAdding(false);
    }
  }

  async function handleMoveTodo(todoId: string, newStatus: TodoStatus) {
    if (movingId) return;

    setMovingId(todoId);
    try {
      const res = await fetch(`/api/todos/${todoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTodos((prev) =>
          prev.map((t) => (t.id === todoId ? updated : t))
        );
      }
    } catch {
      // Ignore
    } finally {
      setMovingId(null);
    }
  }

  async function handleDelete(todoId: string) {
    if (deletingId) return;

    setDeletingId(todoId);
    try {
      const res = await fetch(`/api/todos/${todoId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setTodos((prev) => prev.filter((t) => t.id !== todoId));
      }
    } catch {
      // Ignore
    } finally {
      setDeletingId(null);
    }
  }

  const todosByStatus = PIPELINE.reduce((acc, { status }) => {
    acc[status] = todos.filter((t) => t.status === status);
    return acc;
  }, {} as Record<TodoStatus, Todo[]>);

  return (
    <div className="min-h-screen bg-white dark:bg-black relative">
      <div className="relative z-10">
        <Header />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-zinc-600 dark:text-neutral-400 hover:text-zinc-900 dark:hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <div className="bg-white dark:bg-neutral-800/80 rounded-xl border border-zinc-200 dark:border-neutral-700 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-zinc-200 dark:border-neutral-700">
              <h1 className="text-2xl font-display font-bold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                <ListTodo className="w-6 h-6 text-sky-600 dark:text-sky-400" />
                To-Do List
              </h1>
              <p className="text-sm text-zinc-500 dark:text-neutral-400">
                Pipeline : To Do → Doing → Done
              </p>
            </div>

            <form onSubmit={handleAdd} className="p-4 border-b border-zinc-200 dark:border-neutral-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ajouter une tâche..."
                  className="flex-1 px-4 py-3 bg-white dark:bg-neutral-900/80 border border-zinc-300 dark:border-neutral-600 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  disabled={adding}
                />
                <button
                  type="submit"
                  disabled={adding || !newTitle.trim()}
                  className="flex items-center gap-2 px-4 py-3 bg-sky-600 hover:bg-sky-500 dark:bg-sky-700 dark:hover:bg-sky-600 disabled:bg-zinc-300 dark:disabled:bg-neutral-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors"
                >
                  {adding ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                  <span className="hidden sm:inline">Ajouter</span>
                </button>
              </div>
            </form>

            <div className="p-4 overflow-x-auto">
              {loading ? (
                <div className="p-12 flex justify-center">
                  <Loader2 className="w-8 h-8 text-sky-600 dark:text-sky-400 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-[600px]">
                  {PIPELINE.map(({ status, label, icon: Icon }) => (
                    <div
                      key={status}
                      className="flex flex-col bg-zinc-50 dark:bg-neutral-900/50 rounded-xl border border-zinc-200 dark:border-neutral-700 min-h-[200px]"
                    >
                      <div className="p-4 border-b border-zinc-200 dark:border-neutral-700 flex items-center gap-2">
                        <Icon
                          className={`w-5 h-5 flex-shrink-0 ${
                            status === 'todo'
                              ? 'text-zinc-500 dark:text-neutral-400'
                              : status === 'doing'
                              ? 'text-amber-500 dark:text-amber-400'
                              : 'text-sky-600 dark:text-sky-400'
                          }`}
                        />
                        <span className="font-semibold text-zinc-900 dark:text-white">{label}</span>
                        <span className="ml-auto text-sm text-zinc-500 dark:text-neutral-500">
                          {todosByStatus[status]?.length ?? 0}
                        </span>
                      </div>
                      <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[400px]">
                        {(todosByStatus[status] ?? []).map((todo) => (
                          <div
                            key={todo.id}
                            className="group flex items-start gap-2 p-3 bg-white dark:bg-neutral-800/80 rounded-lg border border-zinc-200 dark:border-neutral-700 hover:border-zinc-300 dark:hover:border-neutral-600 transition-colors shadow-sm dark:shadow-none"
                          >
                            <span className="flex-1 text-sm text-zinc-900 dark:text-white break-words">
                              {todo.title}
                            </span>
                            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              {status !== 'todo' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleMoveTodo(
                                      todo.id,
                                      status === 'done' ? 'doing' : 'todo'
                                    )
                                  }
                                  disabled={movingId === todo.id}
                                  className="p-1.5 text-zinc-500 dark:text-neutral-400 hover:text-sky-600 dark:hover:text-sky-400 rounded transition-colors disabled:opacity-50"
                                  title={status === 'done' ? 'Revenir à Doing' : 'Revenir à To Do'}
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                              )}
                              {status !== 'done' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleMoveTodo(
                                      todo.id,
                                      status === 'todo' ? 'doing' : 'done'
                                    )
                                  }
                                  disabled={movingId === todo.id}
                                  className="p-1.5 text-zinc-500 dark:text-neutral-400 hover:text-sky-600 dark:hover:text-sky-400 rounded transition-colors disabled:opacity-50"
                                  title={status === 'todo' ? 'Passer à Doing' : 'Passer à Done'}
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDelete(todo.id)}
                                disabled={deletingId === todo.id}
                                className="p-1.5 text-zinc-500 dark:text-neutral-400 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors disabled:opacity-50"
                                title="Supprimer"
                              >
                                {deletingId === todo.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                        {(!todosByStatus[status] || todosByStatus[status].length === 0) && (
                          <p className="text-sm text-zinc-500 dark:text-neutral-500 text-center py-6">
                            Aucune tâche
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
