import { useEffect, useMemo, useState } from 'react';
import { Calendar, dayjsLocalizer } from 'react-big-calendar';
import dayjs from 'dayjs';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'dayjs/locale/es';

dayjs.locale('es');

const localizer = dayjsLocalizer(dayjs);

const CalendarComponent = ({
    events,
    onSelectEvent,
    defaultView = 'month',
    views = ['month', 'week', 'day'],
    mobileDefaultView,
    mobileViews,
    calendarDate,
}) => {
    const getIsMobile = () =>
        typeof window !== 'undefined' &&
        window.matchMedia('(max-width: 720px)').matches;

    const [isMobile, setIsMobile] = useState(getIsMobile);
    const [view, setView] = useState(
        getIsMobile() && mobileDefaultView ? mobileDefaultView : defaultView
    );
    const [date, setDate] = useState(calendarDate || new Date());

    const activeViews = useMemo(
        () => (isMobile && mobileViews?.length ? mobileViews : views),
        [isMobile, mobileViews, views]
    );

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const mediaQuery = window.matchMedia('(max-width: 720px)');
        const handleChange = (event) => {
            const nextIsMobile = event.matches;
            setIsMobile(nextIsMobile);
            setView(
                nextIsMobile && mobileDefaultView
                    ? mobileDefaultView
                    : defaultView
            );
        };

        handleChange(mediaQuery);
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [defaultView, mobileDefaultView]);

    useEffect(() => {
        if (!activeViews.includes(view)) {
            setView(activeViews[0] || defaultView);
        }
    }, [activeViews, defaultView, view]);

    useEffect(() => {
        if (calendarDate) {
            setDate(calendarDate);
        }
    }, [calendarDate]);

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
                    dayHeaderFormat: (date) => dayjs(date).format('DD/MM/YYYY'),
                }}
                messages={{
                    next: '+',
                    previous: '-',
                    today: 'Hoy',
                    month: 'Mes',
                    week: 'Semana',
                    day: 'Dia',
                    agenda: 'Agenda',
                    noEventsInRange: 'No hay eventos en este rango.',
                }}
                localizer={localizer}
                events={events}
                views={activeViews}
                onSelectEvent={onSelectEvent}
                eventPropGetter={eventStyle}
                dayPropGetter={dayStyle}
                defaultView={defaultView}
                view={view}
                onView={setView}
                date={date}
                onNavigate={setDate}
            />
        </div>
    );
};

export default CalendarComponent;
