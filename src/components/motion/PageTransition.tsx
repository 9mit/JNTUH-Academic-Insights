import { motion, AnimatePresence, type Variants } from 'framer-motion';


interface PageTransitionProps {
    children: React.ReactNode;
    mode?: 'wait' | 'sync' | 'popLayout';
    id: string; // Unique key for AnimatePresence
}

const variants: Variants = {
    initial: {
        opacity: 0,
        y: 20,
        filter: 'blur(10px)',
    },
    animate: {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: {
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1],
        },
    },
    exit: {
        opacity: 0,
        y: -10,
        filter: 'blur(5px)',
        scale: 0.98,
        transition: {
            duration: 0.3,
            ease: 'backIn',
        },
    },
};


export default function PageTransition({ children, mode = 'wait', id }: PageTransitionProps) {
    return (
        <AnimatePresence mode={mode}>
            <motion.div
                key={id}
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full"
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}
