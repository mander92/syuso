// Button.jsx
import './Button.css';

const Button = ({ variant, children, ...props }) => {
    return (
        <button className={variant} {...props}>
            {children}
        </button>
    );
};

export default Button;
