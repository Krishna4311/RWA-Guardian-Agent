import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Terminal, Pause, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LogMessage {
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' | 'DEBUG';
    message: string;
    metadata?: any;
}

export default function DebugTerminal() {
    const [logs, setLogs] = useState<LogMessage[]>([]);
    const [isPaused, setIsPaused] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        const es = new EventSource("/api/logs/stream");
        eventSourceRef.current = es;

        es.onmessage = (event) => {
            if (isPaused) return;
            try {
                const log: LogMessage = JSON.parse(event.data);
                setLogs((prev) => {
                    const next = [...prev, log];
                    if (next.length > 500) next.shift(); // Keep last 500 logs
                    return next;
                });
            } catch (err) {
                console.error("Failed to parse log:", err);
            }
        };

        es.onerror = (err) => {
            console.error("Log stream error:", err);
            es.close();
        };

        return () => {
            es.close();
        };
    }, [isPaused]);

    // Auto-scroll
    useEffect(() => {
        if (!isPaused && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, isPaused]);

    const getLevelColor = (level: LogMessage['level']) => {
        switch (level) {
            case 'INFO': return 'text-blue-400';
            case 'WARN': return 'text-yellow-400';
            case 'ERROR': return 'text-red-500 font-bold';
            case 'SUCCESS': return 'text-green-400';
            case 'DEBUG': return 'text-slate-500';
            default: return 'text-slate-300';
        }
    };

    return (
        <Card className="bg-slate-950 border-slate-800 font-mono text-xs shadow-2xl overflow-hidden flex flex-col h-[400px]">
            <CardHeader className="bg-slate-900/50 border-b border-slate-800 py-2 px-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-300 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-green-500" />
                    GLASS BOX DEBUG TERMINAL
                </CardTitle>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-400 hover:text-white"
                        onClick={() => setIsPaused(!isPaused)}
                    >
                        {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-400 hover:text-red-400"
                        onClick={() => setLogs([])}
                    >
                        <Trash2 className="w-3 h-3" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden relative">
                <div
                    ref={scrollRef}
                    className="h-full overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
                >
                    {logs.length === 0 && (
                        <div className="text-slate-600 italic text-center mt-10">
                            Waiting for backend stream...
                        </div>
                    )}
                    {logs.map((log, i) => (
                        <div key={i} className="flex gap-2 hover:bg-slate-900/50 p-0.5 rounded">
                            <span className="text-slate-600 shrink-0">
                                [{new Date(log.timestamp).toLocaleTimeString().split(' ')[0]}]
                            </span>
                            <span className={`shrink-0 w-16 font-bold ${getLevelColor(log.level)}`}>
                                {log.level}
                            </span>
                            <span className="text-slate-300 break-all">
                                {log.message}
                            </span>
                        </div>
                    ))}
                    {/* Scanline effect overlay */}
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] opacity-20"></div>
                </div>
            </CardContent>
        </Card>
    );
}
