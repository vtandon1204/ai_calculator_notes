import React, { useEffect, useRef, useState } from "react";
import { SWATCHES } from "@/constants";
import { ColorSwatch } from "@mantine/core";
import { Button } from "@/components/ui/button";
import Draggable from "react-draggable";
import axios from "axios";
import { render } from "react-dom";
// import { Group } from "lucide-react";

interface Response {
    expr: string;
    result: string;
    assign: boolean;
}

interface GenerateResult {
    expression: string;
    answer: string;
}
export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('rgb(255, 255, 255)');
    const [reset, setReset] = useState(false);
    const [result, setResult] = useState<GenerateResult>()
    const [dictOfVars, setDictOfVars] = useState({});
    const [selectedColor, setSelectedColor] = useState<string>('');
    const [latexExpression, setLatexExpression] = useState<Array<string>>([]);
    const [latexPosition, setLatexPosition] = useState({ x: 0, y: 0 });

    const latexRef = useRef<HTMLDivElement>(null); // Create a ref for the draggable div

    // Set the initial position to the center of the screen when the component mounts
    useEffect(() => {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        setLatexPosition({ x: centerX, y: centerY }); // Adjust by the dimensions of the latex div
    }, []);

    useEffect(() => {
        // Check if latexExpression has values
        console.log("Latex Expression:", latexExpression);
    }, [latexExpression]);

    const handleLatexStop = (e: any, data: any) => {
        console.log("Latex dragged to position:", data);
        setLatexPosition({ x: data.x, y: data.y });
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const resizeCanvas = () => {
                    canvas.width = window.innerWidth;
                    canvas.height = window.innerHeight - canvas.offsetTop;
                };
                resizeCanvas();
                window.addEventListener('resize', resizeCanvas);

                return () => window.removeEventListener('resize', resizeCanvas);
            }
        }
    }, []);

    useEffect(() => {
        if (reset) {
            resetCanvas();
            setLatexExpression([]);
            setResult(undefined);
            setDictOfVars({});
            setReset(false);
        }
    }, [reset]);

    useEffect(() => {
        if (latexExpression.length > 0 && window.MathJax) {
            setTimeout(() => {
                window.MathJax.Hub.Queue(['Typeset', window.MathJax.Hub]);
            }, 0);
        }
    }, [latexExpression]);

    useEffect(() => {
        if (result && result.expression && result.answer) {
            try {
                renderLatexToCanvas([{ expression: result.expression, answer: result.answer }]);
            } catch (error) {
                console.error("Error rendering LaTeX to canvas:", error);
            }
        }
    }, [result]);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight - canvas.offsetTop;
                ctx.lineCap = 'round'; // for brush type
                ctx.lineWidth = 3; // for brush size
            }
        }

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/config/TeX-MML-AM_CHTML.js';
        script.async = true;
        document.head.appendChild(script);

        script.onload = () => {
            window.MathJax.Hub.Config({
                tex2jax: { inlineMath: [['$', '$'], ['\\(', '\\)']] }

            })
        };

        return () => {
            document.head.removeChild(script);
        }

    }, []);

    const renderLatexToCanvas = (expressions: Array<{ expression: string, answer: string }>) => {
        expressions.forEach(({ expression, answer }) => {
            const latex = `${expression} = ${answer}`;
            setLatexExpression((prev) => [...prev, latex]);
        });

        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                // ctx.font = '20px Arial';
                // ctx.fillStyle = 'black';
                // ctx.fillText(expression, latexPosition.x, latexPosition.y);
                // setLatexPosition({ x: latexPosition.x, y: latexPosition.y + 50 });
            }
        }
    };

    const runRoute = async () => {
        console.log('Sending data', `${import.meta.env.VITE_API_URL}/calculate`);
        const canvas = canvasRef.current;
        if (canvas) {
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/calculate`, {
                image: canvas.toDataURL('image/png'),
                dict_of_vars: dictOfVars,
            }, { timeout: 10000 });

            const resp = await response.data; // Ensure the response contains the expected data format.

            // If `resp` is an object and contains the array in a specific key:
            if (Array.isArray(resp.data)) {
                resp.data.forEach((data: Response) => {
                    if (data.assign) {
                        setDictOfVars({ ...dictOfVars, [data.expr]: data.result });
                    }
                });

                resp.data.forEach((data: Response) => {
                    setTimeout(() => {
                        setResult({
                            expression: data.expr,
                            answer: data.result,
                        });
                    }, 1000);
                });
            } else {
                console.error("Unexpected response format:", resp);
            }

            // Update latex position logic (unchanged)
            const ctx = canvas.getContext('2d');
            const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
            let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const i = (y * canvas.width + x) * 4;
                    if (imageData.data[i + 3] > 0) { // If pixel is not transparent
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                    }
                }
            }

            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            setLatexPosition({ x: centerX, y: centerY });
        }
    };

    const resetCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    }

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.style.background = 'black';
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.beginPath();
                ctx.moveTo(
                    e.nativeEvent.offsetX,
                    e.nativeEvent.offsetY
                );
                setIsDrawing(true);
            }
        }
    }

    const stopDrawing = () => {
        setIsDrawing(false);
    }

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) {
            return;
        }
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.strokeStyle = color;
                if (color === 'rgb(0,0,0)') {
                    ctx.lineWidth = 12; // Increase this value for larger eraser area
                } else {
                    ctx.lineWidth = 3; // Default line width for drawing
                }
                ctx.lineTo(
                    e.nativeEvent.offsetX,
                    e.nativeEvent.offsetY
                );
                ctx.stroke();
            }
        }
    }
    return (
        <>
            <div className='grid grid-cols-3 gap-2 items-center justify-center p-4'>
                <Button
                    onClick={() => setReset(true)}
                    className='z-20 bg-gray-800 text-white py-2 px-4 rounded-md text-lg transition-transform transform hover:bg-blue-500 hover:scale-105 active:scale-95'
                    variant='default'
                    color='black'
                >Reset</Button>

                <Button
                    onClick={runRoute}
                    className='z-20 bg-gray-800 text-white py-2 px-4 rounded-md text-lg transition-transform transform hover:bg-green-500 hover:scale-105 active:scale-95'
                    variant='default'
                    color='black'
                >Calculate</Button>

                <Button
                    onClick={() => setColor('rgb(0,0,0)')} // Assuming black is the canvas background color
                    className="z-20 bg-gray-800 text-white py-2 px-4 rounded-md text-lg transition-transform transform hover:bg-red-500 hover:scale-105 active:scale-95"
                    variant='default'
                    color='black'
                >
                    Erase
                </Button>

                <div className='z-20 flex flex-wrap items-center gap-2 mt-1 absolute top-32 left-1/2 transform -translate-x-1/2'>
                    {SWATCHES.map((swatch) => (
                        <ColorSwatch
                            key={swatch}
                            color={swatch}
                            onClick={() => {
                                setColor(swatch);
                                setSelectedColor(swatch); // Set the clicked color as selected
                            }}
                            style={{
                                cursor: 'pointer',
                                // border: '1px solid #ccc',
                                border: selectedColor === swatch ? '3px solid #CCFF00' : '1px solid #ccc',
                                width: '30px',
                                height: '30px',
                            }}
                        />
                    ))}
                </div>
            </div>
            <canvas
                ref={canvasRef}
                id="canvas"
                className="canvas bg-black"
                width={window.innerWidth} // or your fixed canvas width
                height={window.innerHeight - 50} // adjust canvas height as needed
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
            />
            <div className="latex-box-container flex flex-col items-center justify-center mt-4">
                {latexExpression.map((latex, index) => (
                    <div
                        key={index}
                        className="latex-content text-white rounded shadow-md"
                        style={{
                            position: 'fixed', // Fixed position relative to the viewport
                            top: '50%', // Center vertically
                            left: '50%', // Center horizontally
                            transform: 'translate(-50%, -50%)', // Adjust to center the box
                            backgroundColor: 'rgba(0, 0, 0, 0.7)', // Background color for visibility
                            color: 'white', // Text color
                            padding: '10px 20px', // Padding to create space around the content
                            fontSize: '20px', // Font size for the text
                            zIndex: 10, // Ensures the box is on top of other elements
                            border: '2px solid #fff', // White border for the box
                            borderRadius: '10px', // Rounded corners
                            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.5)', // Box shadow
                            maxWidth: '80%', // Max width of the box (to avoid going too wide)
                            width: 'auto', // Automatically adjust width based on content
                            wordWrap: 'break-word', // Ensure long words break properly within the box
                            textAlign: 'center', // Center the text inside the box
                        }}
                    >
                        <div>{latex}</div>
                    </div>
                ))}
            </div>


        </>
    );
}






