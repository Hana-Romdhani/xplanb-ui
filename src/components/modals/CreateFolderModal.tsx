import { useState } from 'react';
import { X, Folder } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Toaster, toast } from 'sonner';

interface CreateFolderModalProps {
  onClose: () => void;
}

const colors = [
  { name: 'Blue', value: 'bg-blue-500' },
  { name: 'Purple', value: 'bg-purple-500' },
  { name: 'Green', value: 'bg-green-500' },
  { name: 'Orange', value: 'bg-orange-500' },
  { name: 'Red', value: 'bg-red-500' },
  { name: 'Pink', value: 'bg-pink-500' },
];

export default function CreateFolderModal({ onClose }: CreateFolderModalProps) {
  const [folderName, setFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState(colors[0].value);

  const handleCreate = () => {
    if (!folderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    toast.success('Folder created successfully!');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-card rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-[20px]">Create New Folder</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-lg">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div>
            <Label htmlFor="folderName">Folder Name</Label>
            <Input
              id="folderName"
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="e.g., Q4 Planning"
              className="mt-1.5 rounded-xl"
              autoFocus
            />
          </div>

          <div>
            <Label>Folder Color</Label>
            <div className="grid grid-cols-6 gap-3 mt-3">
              {colors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-full aspect-square rounded-xl ${color.value} transition-transform hover:scale-110 ${
                    selectedColor === color.value ? 'ring-2 ring-offset-2 ring-blue-600' : ''
                  }`}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
            <p className="text-[14px] text-muted-foreground mb-3">Preview:</p>
            <div className="flex items-center space-x-3">
              <div className={`w-12 h-12 rounded-xl ${selectedColor} flex items-center justify-center`}>
                <Folder className="w-6 h-6 text-white" />
              </div>
              <div>
                <p>{folderName || 'New Folder'}</p>
                <p className="text-[14px] text-muted-foreground">0 documents</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={handleCreate} className="rounded-xl">
            Create Folder
          </Button>
        </div>
      </div>
    </div>
  );
}
