import React from "react";

interface QuickActionItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  iconClassName?: string; // For custom icon styling
  cardColor?: string; // e.g., "bg-green-50" 
  hoverColor?: string;
}

interface QuickActionsCardProps {
  title?: string;
  actions: QuickActionItem[];
  cardHeight?: string; // e.g., "h-32"
  iconSize?: string; // e.g., "text-3xl" or "w-10 h-10"
  className?: string;
}

const QuickActionsCard: React.FC<QuickActionsCardProps> = ({
  title = "Quick Actions",
  actions,
  cardHeight = "h-36", // Default increased height
  iconSize = "text-4xl", // Default larger icon size
  className = "",
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      )}
      
      <div className="grid grid-cols-4 gap-6"> {/* Always 4 columns */}
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={`flex flex-col items-center justify-center p-4 bg-green-50 hover:bg-green-100 
              rounded-lg transition-all duration-200 ${cardHeight} ${action.cardColor || "bg-green-100"} 
              ${action.hoverColor || "hover:bg-green-200"}`}
          >
            <div className={`${iconSize} text-green-600 mb-3 ${action.iconClassName || ""}`}>
              {action.icon}
            </div>
            <span className="text-md font-medium text-gray-700">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActionsCard;