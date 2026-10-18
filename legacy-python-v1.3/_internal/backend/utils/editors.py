import datetime
import calendar


def currency_format(num: int) -> str:
    return f"{num:,}".replace(",", ".")

def get_uvegfal_tablak_szama(width):
	return int(abs(width - 21) // 100 + 1)


def get_last_day_of_current_month(next_month_before_day=10) -> str:
    """
    return the current_month last_day
    OR the next_month last_day
    if current_month_last_day - today < next_month_before_day
    """
    today = datetime.date.today()

    # Aktuális hónap utolsó napja
    current_last_day = datetime.date(today.year, today.month, calendar.monthrange(today.year, today.month)[1])

    def get_month_name(month: int) -> str:
        month_name_hu = [
            "Január", "Február", "Március", "Április", "Május", "Június",
            "Július", "Augusztus", "Szeptember", "Október", "November", "December"
        ]
        return month_name_hu[month - 1]
    
    if (current_last_day - today).days < next_month_before_day:
        if today.month == 12:
            next_month_year = today.year + 1
            next_month = 1
        else:
            next_month_year = today.year
            next_month = today.month + 1

        next_last_day = calendar.monthrange(next_month_year, next_month)[1]
        return f"{get_month_name(next_month)} {next_last_day}"
    else:
        return f"{get_month_name(today.month)} {current_last_day.day}"
