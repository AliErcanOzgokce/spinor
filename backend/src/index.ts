import { app } from './app';
import { config } from './config';

const startServer = async (port: number): Promise<void> => {
    try {
        await new Promise<void>((resolve, reject) => {
            const server = app.listen(port, () => {
                console.log(`Server is running on port ${port}`);
                resolve();
            });

            server.on('error', (error: NodeJS.ErrnoException) => {
                if (error.code === 'EADDRINUSE') {
                    console.log(`Port ${port} is already in use. Trying port ${port + 1}...`);
                    server.close();
                    startServer(port + 1);
                } else {
                    reject(error);
                }
            });
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Start server with initial port
startServer(Number(config.port)); 
 
 