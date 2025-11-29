import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileJson, Lock, Server, CheckCircle2, ArrowRight } from "lucide-react";
import { BlockchainRecord } from "@shared/types";
import { motion, AnimatePresence } from "framer-motion";

interface MasumiProcessVisualizerProps {
    latestRecord: BlockchainRecord | null;
}

export default function MasumiProcessVisualizer({ latestRecord }: MasumiProcessVisualizerProps) {
    const [activeStep, setActiveStep] = useState(0);

    // Reset animation when record changes
    useEffect(() => {
        if (latestRecord) {
            setActiveStep(0);
            const timers = [
                setTimeout(() => setActiveStep(1), 500),  // Hash generated
                setTimeout(() => setActiveStep(2), 1500), // Sent to Masumi
                setTimeout(() => setActiveStep(3), 2500), // Verified
            ];
            return () => timers.forEach(clearTimeout);
        }
    }, [latestRecord?.id]);

    if (!latestRecord) return null;

    const steps = [
        {
            id: 0,
            icon: FileJson,
            title: "Data Capture",
            desc: "Reading captured",
            color: "text-blue-400",
            bg: "bg-blue-500/10",
            border: "border-blue-500/20"
        },
        {
            id: 1,
            icon: Lock,
            title: "Hashing",
            desc: "SHA-256 Generated",
            color: "text-purple-400",
            bg: "bg-purple-500/10",
            border: "border-purple-500/20"
        },
        {
            id: 2,
            icon: Server,
            title: "Masumi Network",
            desc: "Logging Audit Trail",
            color: "text-orange-400",
            bg: "bg-orange-500/10",
            border: "border-orange-500/20"
        },
        {
            id: 3,
            icon: CheckCircle2,
            title: "Verified",
            desc: "Immutable Record",
            color: "text-green-400",
            bg: "bg-green-500/10",
            border: "border-green-500/20"
        }
    ];

    return (
        <Card className="bg-slate-800/50 border-slate-700 mb-6 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />

            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <Server className="w-5 h-5 text-blue-400" />
                    Masumi Verification Process
                    <Badge variant="outline" className="ml-auto border-blue-500/30 text-blue-400">
                        Live Pipeline
                    </Badge>
                </CardTitle>
            </CardHeader>

            <CardContent>
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-slate-700 -z-10" />

                    {steps.map((step, index) => {
                        const isActive = activeStep >= index;
                        const isCurrent = activeStep === index;
                        const Icon = step.icon;

                        return (
                            <div key={step.id} className="relative flex flex-col items-center z-10 w-full md:w-auto">
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0.5 }}
                                    animate={{
                                        scale: isActive ? 1 : 0.8,
                                        opacity: isActive ? 1 : 0.5,
                                        borderColor: isActive ? 'rgba(59, 130, 246, 0.5)' : 'rgba(51, 65, 85, 1)'
                                    }}
                                    className={`
                    w-16 h-16 rounded-full flex items-center justify-center border-2 
                    ${isActive ? `${step.bg} ${step.border} ${step.color}` : "bg-slate-800 border-slate-700 text-slate-600"}
                    transition-colors duration-300 shadow-lg
                  `}
                                >
                                    <Icon size={24} />
                                </motion.div>

                                <div className="mt-3 text-center">
                                    <p className={`text-sm font-bold ${isActive ? "text-white" : "text-slate-500"}`}>
                                        {step.title}
                                    </p>
                                    <p className="text-xs text-slate-500">{step.desc}</p>
                                </div>

                                {/* Mobile Arrow */}
                                {index < steps.length - 1 && (
                                    <ArrowRight className="md:hidden mt-2 text-slate-700" size={20} />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Details Panel */}
                <AnimatePresence mode="wait">
                    {latestRecord && activeStep === 3 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-6 p-4 rounded-lg bg-slate-900/50 border border-slate-700 font-mono text-xs space-y-2"
                        >
                            <div className="flex justify-between">
                                <span className="text-slate-500">Record ID:</span>
                                <span className="text-blue-400">{latestRecord.id}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Data Hash:</span>
                                <span className="text-purple-400">{latestRecord.txHash.substring(0, 40)}...</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Masumi Tx:</span>
                                <span className="text-green-400">{latestRecord.masumiTxId ? latestRecord.masumiTxId.substring(0, 40) + '...' : 'Pending...'}</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
}
