import googlemaps
from googlemaps import convert
import openpyxl
from openpyxl import load_workbook

gclient = googlemaps.Client('AIzaSyDv2oHqbxdnEhE0vZqyDh7vNjetHoJUf5M')

def reverse_geocode(client, latlng, result_type=None, location_type=None,
                    language=None):
    """
    Reverse geocoding is the process of converting geographic coordinates into a
    human-readable address.
    :param latlng: The latitude/longitude value or place_id for which you wish
        to obtain the closest, human-readable address.
    :type latlng: string, dict, list, or tuple
    :param result_type: One or more address types to restrict results to.
    :type result_type: string or list of strings
    :param location_type: One or more location types to restrict results to.
    :type location_type: list of strings
    :param language: The language in which to return results.
    :type langauge: string
    :rtype: list of reverse geocoding results.
    """

    # Check if latlng param is a place_id string.
    #  place_id strings do not contain commas; latlng strings do.
    if convert.is_string(latlng) and ',' not in latlng:
        params = {"place_id": latlng}
    else:
        params = {"latlng": convert.latlng(latlng)}

    if result_type:
        params["result_type"] = convert.join_list("|", result_type)

    if location_type:
        params["location_type"] = convert.join_list("|", location_type)

    if language:
        params["language"] = language

    return client._request("/maps/api/geocode/json", params).get("results", [])

water_points = load_workbook('WATERWAYS_10m_INTERVALS.xlsx')
LATS = water_points['WATERWAYS_10m_INTERVALS']['A'][1:]
LONS = water_points['WATERWAYS_10m_INTERVALS']['B'][1:]

coords = []
for i in range(len(LATS)):
    latlng = str(LATS[i].value) + "," + str(LONS[i].value)
    coords.append(str(latlng))

n = 101
for coord in coords[101:2000]:
    address = "no postal code found"
    try:
        coord_json = reverse_geocode(gclient, coord)

        for result in coord_json:
            if 'street_address' in result['types']:
                address = result['formatted_address']
                break
            else:
                address = coord_json[0]['formatted_address']
    except googlemaps.exceptions._RetriableRequest:
        address = "error in finding address"

    water_points['WATERWAYS_10m_INTERVALS']['C'][n].value = address
    n += 1

water_points.save('WATERWAYS_10m_INTERVALS.xlsx')
