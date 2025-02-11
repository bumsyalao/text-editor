import TextEditor from './components/TextEditor';

export default function Home() {

  return (
    <div className="flex flex-col items-center justify-center min-h-screen ">
      <div className="w-full max-w-3xl p-4 rounded-lg">
        <TextEditor />
      </div>
      <footer className="fixed bottom-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center py-3 px-4 rounded-lg">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://github.com/bumsyalao/text-editor"
          target="_blank"
          rel="noopener noreferrer"
        >
          view sourcecode
        </a>
      </footer>
    </div>
  );
}
