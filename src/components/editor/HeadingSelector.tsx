import { useState, useEffect, useRef } from 'react';
import { Heading1, Heading2, Heading3, Heading4 } from 'lucide-react';
import { Button } from '../ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface HeadingSelectorProps {
    editor: any; // EditorJS instance
    onHeadingChange?: () => void;
}

export default function HeadingSelector({ editor, onHeadingChange }: HeadingSelectorProps) {
    const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);
    const [currentHeading, setCurrentHeading] = useState<number | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (!editor) return;

        const updateSelection = async () => {
            try {
                // Get current block index
                const blockIndex = editor.blocks.getCurrentBlockIndex();

                if (blockIndex === -1 || blockIndex === undefined) {
                    setIsVisible(false);
                    return;
                }

                // Get current block
                const block = editor.blocks.getBlockByIndex(blockIndex);

                if (!block) {
                    setIsVisible(false);
                    return;
                }

                // Check if it's a heading block
                const isHeading = block.name === 'header';
                const headingLevel = isHeading && block.data ? block.data.level : null;

                setSelectedBlockIndex(blockIndex);
                setCurrentHeading(headingLevel);

                // Get selection position for floating toolbar
                const selection = window.getSelection();
                const hasSelection = selection && selection.toString().trim().length > 0;

                // Show if text is selected OR if current block is a heading
                if (hasSelection && selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();

                    setPosition({
                        top: rect.top - 60,
                        left: rect.left + (rect.width / 2),
                    });
                    setIsVisible(true);
                } else if (isHeading) {
                    // Show toolbar when clicking on a heading block
                    const editorElement = document.getElementById('editorjs');
                    if (editorElement) {
                        // Find the block element in the DOM
                        const blockElements = editorElement.querySelectorAll('[data-block]');
                        if (blockElements[blockIndex]) {
                            const blockRect = blockElements[blockIndex].getBoundingClientRect();
                            setPosition({
                                top: blockRect.top - 60,
                                left: blockRect.left + (blockRect.width / 2),
                            });
                            setIsVisible(true);
                        }
                    }
                } else {
                    // Hide if no text is selected and not a heading
                    setIsVisible(false);
                }
            } catch (error) {
                console.error('Error getting selection:', error);
                setIsVisible(false);
            }
        };

        // Listen for selection changes
        const handleSelectionChange = () => {
            // Debounce to avoid too many updates
            clearTimeout((window as any).headingSelectorTimeout);
            (window as any).headingSelectorTimeout = setTimeout(updateSelection, 100);
        };

        // Listen for clicks in editor
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const editorElement = document.getElementById('editorjs');
            if (editorElement && editorElement.contains(target)) {
                setTimeout(updateSelection, 150);
            } else {
                setIsVisible(false);
            }
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        document.addEventListener('click', handleClick);
        const editorElement = document.getElementById('editorjs');
        if (editorElement) {
            editorElement.addEventListener('keyup', handleSelectionChange);
        }

        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            document.removeEventListener('click', handleClick);
            if (editorElement) {
                editorElement.removeEventListener('keyup', handleSelectionChange);
            }
            if ((window as any).headingSelectorTimeout) {
                clearTimeout((window as any).headingSelectorTimeout);
            }
        };
    }, [editor]);

    const changeToHeading = async (level: number) => {
        if (!editor || selectedBlockIndex === null) return;

        try {
            const currentBlock = editor.blocks.getBlockByIndex(selectedBlockIndex);

            if (!currentBlock) return;

            // Get the text content from current block
            let textContent = '';

            if (currentBlock.name === 'header') {
                textContent = currentBlock.data.text || '';
            } else if (currentBlock.name === 'paragraph') {
                textContent = currentBlock.data.text || '';
            } else if (currentBlock.name === 'list') {
                // For lists, use first item or join items
                textContent = currentBlock.data.items?.[0]?.replace(/<[^>]*>/g, '') || '';
            } else {
                // For other block types, try to extract text
                try {
                    textContent = JSON.stringify(currentBlock.data);
                } catch {
                    textContent = 'Heading';
                }
            }

            // If there's selected text, use that instead
            const selection = window.getSelection();
            if (selection && selection.toString().trim()) {
                textContent = selection.toString().trim();
            }

            // Save current editor state
            const savedData = await editor.save();

            // Create new header block data
            const newHeaderData = {
                text: textContent.trim() || 'Heading',
                level: level,
            };

            // Replace current block - delete and insert
            await editor.blocks.delete(selectedBlockIndex);

            // Insert new header block at the same position
            await editor.blocks.insert('header', newHeaderData, {}, selectedBlockIndex, true);

            // Move cursor to the new header
            setTimeout(() => {
                try {
                    editor.caret.setToBlock(selectedBlockIndex, 'end');
                } catch (caretError) {
                    // If caret API fails, just focus the editor
                    const editorElement = document.getElementById('editorjs');
                    if (editorElement) {
                        editorElement.focus();
                    }
                }
            }, 100);

            if (onHeadingChange) {
                onHeadingChange();
            }

            setIsVisible(false);
        } catch (error) {
            console.error('Error changing to heading:', error);
        }
    };

    const changeHeadingLevel = async (level: number) => {
        if (!editor || selectedBlockIndex === null) return;

        try {
            const currentBlock = editor.blocks.getBlockByIndex(selectedBlockIndex);

            if (currentBlock && currentBlock.name === 'header') {
                // Update existing header level
                await editor.blocks.update(selectedBlockIndex, {
                    ...currentBlock.data,
                    level: level,
                });

                if (onHeadingChange) {
                    onHeadingChange();
                }

                setCurrentHeading(level);
            }
        } catch (error) {
            console.error('Error changing heading level:', error);
        }
    };

    const handleHeadingClick = (level: number) => {
        if (currentHeading !== null) {
            // Change existing heading level
            changeHeadingLevel(level);
        } else {
            // Convert to heading
            changeToHeading(level);
        }
    };

    if (!isVisible || !editor) {
        return null;
    }

    const headingOptions = [
        { level: 1, label: 'H1 Heading 1', icon: Heading1 },
        { level: 2, label: 'H2 Heading 2', icon: Heading2 },
        { level: 3, label: 'H3 Heading 3', icon: Heading3 },
        { level: 4, label: 'H4 Heading 4', icon: Heading4 },
    ];

    return (
        <div
            className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2"
            style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
                transform: 'translate(-50%, 0)',
            }}
        >
            <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground px-2 py-1">Heading:</span>
                {headingOptions.map(({ level, label, icon: Icon }) => (
                    <Button
                        key={level}
                        variant={currentHeading === level ? 'default' : 'ghost'}
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => handleHeadingClick(level)}
                        title={label}
                    >
                        <Icon className="w-4 h-4 mr-1" />
                        H{level}
                    </Button>
                ))}
            </div>
        </div>
    );
}
