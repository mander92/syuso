import { Calendar, dayjsLocalizer } from 'react-big-calendar';
import dayjs from 'dayjs';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'dayjs/locale/es';

dayjs.locale('es');

const localizer = dayjsLocalizer(dayjs);

const CalendarComponent = ({ events, onSelectEvent, defaultView }) => {
    const eventStyle = (event) => {
        let backgroundColor = '';
        switch (event.status) {
            case 'pending':
                backgroundColor = 'lightsalmon';
                break;
            case 'confirmed':
                backgroundColor = 'lightgreen';
                break;
            case 'completed':
                backgroundColor = 'green';
                break;
            default:
                backgroundColor = '#94a3b8';
        }
        return {
            style: {
                backgroundColor,
            },
        };
    };

    const dayStyle = (date) => {
        const day = date.getDay();
        let backgroundColor = '';

        if (day === 0) {
            backgroundColor = 'lightcoral';
        } else if (day === 6) {
            backgroundColor = 'lightgray';
        } else {
            backgroundColor = 'white';
        }

        return {
            style: {
                backgroundColor,
            },
        };
    };

    return (
        <div className='calendar'>
            <Calendar
                formats={{
                    dayHeaderFormat: (date) => {
                        return dayjs(date).format('DD/MM/YYYY');
                    },
                }}
                messages={{
                    next: '+',
                    previous: '-',
                    today: 'Hoy',
                    month: 'Mes',
                    week: 'Semana',
                    day: 'Día',
                }}
                localizer={localizer}
                events={events}
                views={['month', 'week', 'day']}
                onSelectEvent={onSelectEvent}
                eventPropGetter={eventStyle}
                dayPropGetter={dayStyle}
                defaultView={defaultView}
            />
        </div>
    );
};

export default CalendarComponent;
