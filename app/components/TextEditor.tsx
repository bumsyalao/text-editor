'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
    Editor,
    EditorState,
    Modifier,
    SelectionState,
    ContentBlock,
    CompositeDecorator,
    ContentState,
    getDefaultKeyBinding
} from 'draft-js';
import { defaultSuggestionsList } from '@/app/constants/defaultSuggestionList';
import 'draft-js/dist/Draft.css';



/**
 * Custom hook for debouncing a value.
 * This delays updating the debounced value until the user stops changing the input.
 */
const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        // Set a timeout to update the debounced value after the specified delay.
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        // Clear the timeout if the value or delay changes.
        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
};

interface AutocompleteEntryProps {
    children: React.ReactNode;
    contentState: ContentState;
    entityKey: string;
}

/**
 * Component to render autocompleted text.
 * It simply renders its children in orange to differentiate from normal text.
 */

const AutocompleteEntry = (props: AutocompleteEntryProps): React.ReactElement => {
    return <span style={{ color: 'orange' }}>{props.children}</span>;
};

/**
 * Strategy for the composite decorator.
 * This regex matches the autocomplete trigger, which is "<>" followed by zero or more word characters.
 */
const autocompleteStrategy = (
    contentBlock: ContentBlock,
    callback: (start: number, end: number) => void,
) => {
    const text = contentBlock.getText();
    // Regex matches <> and any following word characters.
    const regex = /<>(\w*)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        // Call the callback with the start and end indices of the matched text.
        callback(match.index, match.index + match[0].length);
    }
};

// Composite decorator that applies our autocomplete strategy and component.
const compositeDecorator = new CompositeDecorator([
    {
        strategy: autocompleteStrategy,
        component: AutocompleteEntry,
    },
]);
const TextEditor: React.FC = () => {
    // Editor state is null initially and will be initialized on the client.
    const [editorState, setEditorState] = useState<EditorState | null>(null);
    // Flag to ensure the editor is only rendered on the client to avoid SSR issues.
    const [isMounted, setIsMounted] = useState(false);
    // Controls whether the autocomplete suggestion list is active.
    const [autocompleteActive, setAutocompleteActive] = useState(false);
    // The current match string after the autocomplete trigger.
    const [matchString, setMatchString] = useState('');
    // List of suggestions available.
    const [suggestionsList, setSuggestionsList] = useState(defaultSuggestionsList);
    // Filtered suggestions based on the current match string.
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
    // Index of the currently highlighted suggestion.
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    // Ref to the Editor component.
    const editorRef = useRef<Editor | null>(null);
    // Ref to the suggestion list element.
    const suggestionsRef = useRef<HTMLUListElement | null>(null);
    // Debounced value for the match string to prevent rapid updates.
    const debouncedMatchString = useDebounce(matchString, 300);

    // Update the suggestion list if a new term is debounced and not already present.
    useEffect(() => {
        if (debouncedMatchString && !suggestionsList.includes(debouncedMatchString)) {
            setSuggestionsList((prev) => [...prev, debouncedMatchString]);
        }
    }, [debouncedMatchString, suggestionsList]);

    /**
     * Handles changes in the editor.
     * This function checks for:
     * - Empty content (reinitializes the editor state).
     * - Backspace removal on autocompleted entries.
     * - Autocomplete trigger detection.
     */
    const handleChange = (newEditorState: EditorState) => {
        const content = newEditorState.getCurrentContent();
        const selection = newEditorState.getSelection();
        const blockKey = selection.getStartKey();
        const block = content.getBlockForKey(blockKey);
        const text = block.getText();
        const cursorPosition = selection.getStartOffset();

        // If the editor loses focus, simply update the state.
        if (!selection.getHasFocus()) {
            setEditorState(newEditorState);
            return;
        }

        // Check for backspace on autocompleted entry:
        // If the characters before the cursor are "<>", remove that range.
        if (
            cursorPosition >= 2 &&
            text.length > 0 &&
            text[cursorPosition - 1] === '>' &&
            text[cursorPosition - 2] === '<'
        ) {
            const newContent = Modifier.removeRange(content, selection, 'backward');
            const newState = EditorState.push(newEditorState, newContent, 'remove-range');
            // Reapply the composite decorator for consistency.
            setEditorState(EditorState.set(newState, { decorator: compositeDecorator }));
            return;
        }

        // Check for autocomplete trigger: look for "<>" followed by zero or more word characters before the cursor.
        const match = /<>(\w*)$/.exec(text.substring(0, cursorPosition));
        if (match) {
            // Set the match string (empty string if nothing follows <>).
            setMatchString(match[1]);
            // Filter suggestions based on the current match string.
            setFilteredSuggestions(
                suggestionsList.filter((s) =>
                    s.toLowerCase().startsWith(match[1].toLowerCase())
                )
            );
            setAutocompleteActive(true);
        } else {
            // No match found; disable autocomplete.
            setAutocompleteActive(false);
            setMatchString('');
        }
        setEditorState(newEditorState);
    };

    /**
     * Inserts an autocomplete entry into the editor.
     * Replaces the text starting from the autocomplete trigger ("<>") to the cursor with the selected suggestion.
     */
    const insertAutocompleteEntry = (text: string) => {
        if (!editorState) return;
        const content = editorState.getCurrentContent();
        const selection = editorState.getSelection();
        const blockKey = selection.getStartKey();
        const block = content.getBlockForKey(blockKey);
        const textBeforeCursor = block.getText().substring(0, selection.getStartOffset());
        // Find the trigger position.
        const matchStart = textBeforeCursor.lastIndexOf('<>');
        if (matchStart === -1) return;

        // Create a new selection covering the autocomplete trigger.
        const newSelection = selection.merge({
            anchorOffset: matchStart,
            focusOffset: selection.getStartOffset(),
        }) as SelectionState;

        // Replace the trigger text with the selected suggestion.
        const newContent = Modifier.replaceText(content, newSelection, text, undefined);
        const newState = EditorState.push(editorState, newContent, 'insert-characters');
        // Reapply the composite decorator.
        setEditorState(EditorState.set(newState, { decorator: compositeDecorator }));
        // Reset autocomplete state.
        setAutocompleteActive(false);
        setMatchString('');
    };

    /**
     * Removes an autocomplete entry from the editor.
     */
    const removeAutoCompleteEntry = () => {
        if (!editorState) return;
        const content = editorState.getCurrentContent();
        const selection = editorState.getSelection();
        const blockKey = selection.getStartKey();
        const block = content.getBlockForKey(blockKey);
        const text = block.getText();
        const cursorPosition = selection.getStartOffset();

        // Find if there is an autocomplete entry
        const match = /<>(\w*)/.exec(text);
        if (match) {
            const matchStart = match.index;
            const matchEnd = matchStart + match[0].length;

            // If backspace is pressed while inside the entry, delete the whole thing
            if (cursorPosition > matchStart && cursorPosition <= matchEnd) {
                const newSelection = selection.merge({
                    anchorOffset: matchStart,
                    focusOffset: matchEnd,
                }) as SelectionState;

                const newContent = Modifier.removeRange(content, newSelection, 'backward');
                const newState = EditorState.push(editorState, newContent, 'remove-range');

                // Reapply decorator
                setEditorState(EditorState.set(newState, { decorator: compositeDecorator }));
                setAutocompleteActive(false);
            }
        }
    }

    /**
     * Handles key commands such as arrow navigation and selection of suggestions.
     */
    const handleKeyCommand = (command: string) => {
        if (command === 'up-arrow') {
            setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
            return 'handled';
        }
        if (command === 'down-arrow') {
            setHighlightedIndex((prev) =>
                prev < filteredSuggestions.length - 1 ? prev + 1 : prev
            );
            return 'handled';
        }
        if (command === 'select-suggestion') {
            insertAutocompleteEntry(filteredSuggestions[highlightedIndex] || matchString);
            return 'handled';
        }
        if (command === 'backspace') {
            if (!editorState) return 'not-handled';
            const content = editorState.getCurrentContent();
            const selection = editorState.getSelection();
            const blockKey = selection.getStartKey();
            const block = content.getBlockForKey(blockKey);
            const text = block.getText();

            // Check if there is an autocomplete entry
            const match = /<>(\w*)/.exec(text);
            if (match) {
                removeAutoCompleteEntry();
                return 'handled';
            }
            return 'not-handled';
        }
        return 'not-handled';
    };

    /**
     * Custom key binding function for the editor.
     * Maps certain keys (arrow keys, Enter, Tab) to custom commands.
     */
    const keyBindingFn = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowUp') return 'up-arrow';
        if (e.key === 'ArrowDown') return 'down-arrow';
        if (e.key === 'Enter' || e.key === 'Tab') return 'select-suggestion';
        // return null;
        return getDefaultKeyBinding(e);
    };

    // Prevent abrupt scrolling in the suggestions list.
    useEffect(() => {
        if (suggestionsRef.current) {
            suggestionsRef.current.addEventListener('wheel', (e) => {
                e.preventDefault();
                suggestionsRef.current?.scrollBy({
                    top: e.deltaY,
                    behavior: 'smooth',
                });
            });
        }
    }, []);

    // Initialize the editor state on the client.
    useEffect(() => {
        setIsMounted(true);
        setEditorState(EditorState.createEmpty(compositeDecorator));
    }, []);

    // Don't render the editor until it is mounted and initialized.
    if (!isMounted || !editorState) return null;

    return (
        <div>
            {/* Editor container */}
            <div
                className="border border-gray-300 p-4 min-h-[100px] cursor-text"
                onClick={() => editorRef.current?.focus()}
            >
                <Editor
                    ref={editorRef}
                    editorState={editorState}
                    onChange={handleChange}
                    handleKeyCommand={handleKeyCommand}
                    keyBindingFn={keyBindingFn}
                    // A placeholder to guide users on how to use autocomplete.
                    placeholder='Use <> to autocomplete a suggestion, new suggestions are added when you type'
                />
            </div>
            {/* Autocomplete suggestions list */}
            {autocompleteActive && (
                <ul
                    ref={suggestionsRef}
                    className="border border-gray-400 bg-white absolute mt-2 p-2 list-none max-h-[200px] overflow-y-auto"
                >
                    {filteredSuggestions.map((suggestion, index) => (
                        <li
                            key={suggestion}
                            onMouseDown={() => insertAutocompleteEntry(suggestion)}
                            className={`p-2 cursor-pointer ${index === highlightedIndex ? 'bg-gray-300' : ''
                                }`}
                        >
                            {suggestion}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default TextEditor;
