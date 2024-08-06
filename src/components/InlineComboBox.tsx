interface props {
  title: string;
  items: string[];
  text_color: string;
  bg_color: string;
  border_color: string;
  item_index: number;
  onSelectItem: (new_index: number) => void;
}

const InlineComboBox = ({
  title,
  items,
  item_index,
  text_color,
  bg_color,
  border_color,
  onSelectItem,
}: props) => {
  return (
    <div className="flex flex-col gap-2 pb-2 h-auto items-start font-mono text-sm select-none">
      {title}
      <div
        className={
          "flex flex-row items-center justify-between w-64 h-full py-2 border rounded-md" +
          text_color +
          bg_color +
          border_color
        }
      >
        <div
          className="w-4 pl-4 "
          onClick={() => {
            onSelectItem((item_index - 1 + items.length) % items.length);
          }}
        >
          <div
            className={
              "w-3 aspect-square rotate-45 border-b border-l " +
              bg_color +
              border_color
            }
          />
        </div>
        <p className="text-sm font-mono w-auto">{items[item_index]}</p>
        <div
          className="w-4 pr-8 "
          onClick={() => {
            onSelectItem((item_index + 1) % items.length);
          }}
        >
          <div
            className={
              "w-3 aspect-square rotate-45 border-t border-r " +
              bg_color +
              border_color
            }
          />
        </div>
      </div>
    </div>
  );
};

export default InlineComboBox;
