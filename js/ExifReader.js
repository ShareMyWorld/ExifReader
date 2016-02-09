// Generated by CoffeeScript 1.10.0

/*
 * ExifReader 1.1.1
 * http://github.com/mattiasw/exifreader
 * Copyright (C) 2011-2014  Mattias Wallander <mattias@wallander.eu>
 * Licensed under the GNU Lesser General Public License version 3 or later
 * See license text at http://www.gnu.org/licenses/lgpl.txt
 */

(function() {
  (typeof exports !== "undefined" && exports !== null ? exports : this).ExifReader = (function() {
    var _APP0_MARKER, _APP15_MARKER, _APP1_MARKER, _APP_ID_OFFSET, _APP_MARKER_SIZE, _BYTES_Exif, _BYTE_ORDER_BIG_ENDIAN, _BYTE_ORDER_LITTLE_ENDIAN, _JPEG_ID, _JPEG_ID_SIZE, _MIN_DATA_BUFFER_LENGTH, _TIFF_HEADER_OFFSET, _getTagValueFunctionName;

    _MIN_DATA_BUFFER_LENGTH = 2;

    _JPEG_ID_SIZE = 2;

    _JPEG_ID = 0xffd8;

    _APP_MARKER_SIZE = 2;

    _APP0_MARKER = 0xffe0;

    _APP1_MARKER = 0xffe1;

    _APP15_MARKER = 0xffef;

    _APP_ID_OFFSET = 4;

    _BYTES_Exif = 0x45786966;

    _TIFF_HEADER_OFFSET = 10;

    _BYTE_ORDER_BIG_ENDIAN = 0x4949;

    _BYTE_ORDER_LITTLE_ENDIAN = 0x4d4d;

    _getTagValueFunctionName = {
      1: '_getByteAt',
      2: '_getAsciiAt',
      3: '_getShortAt',
      4: '_getLongAt',
      5: '_getRationalAt',
      7: '_getUndefinedAt',
      9: '_getSlongAt',
      10: '_getSrationalAt'
    };

    function ExifReader() {
      this._tiffHeaderOffset = 0;
    }


    /*
     * Loads all the Exif tags from the specified image file buffer.
     *
     * data ArrayBuffer Image file data
     */

    ExifReader.prototype.load = function(data) {
      return this.loadView(new DataView(data));
    };


    /*
     * Loads all the Exif tags from the specified image file buffer view. Probably
     * used when DataView isn't supported by the browser.
     *
     * @_dataView DataView Image file data view
     */

    ExifReader.prototype.loadView = function(_dataView) {
      this._dataView = _dataView;
      this._tags = {};
      this._checkImageHeader();
      this._readTags();
      return this._dataView = null;
    };

    ExifReader.prototype._checkImageHeader = function() {
      if (this._dataView.byteLength < _MIN_DATA_BUFFER_LENGTH || this._dataView.getUint16(0, false) !== _JPEG_ID) {
        throw new Error('Invalid image format');
      }
      this._parseAppMarkers(this._dataView);
      if (!this._hasExifData()) {
        throw new Error('No Exif data');
      }
    };

    ExifReader.prototype._parseAppMarkers = function(dataView) {
      var appMarkerPosition, fieldLength, results;
      appMarkerPosition = _JPEG_ID_SIZE;
      results = [];
      while (true) {
        if (dataView.byteLength < appMarkerPosition + _APP_ID_OFFSET + 5) {
          break;
        }
        if (this._isApp1ExifMarker(dataView, appMarkerPosition)) {
          fieldLength = dataView.getUint16(appMarkerPosition + _APP_MARKER_SIZE, false);
          this._tiffHeaderOffset = appMarkerPosition + _TIFF_HEADER_OFFSET;
        } else if (this._isAppMarker(dataView, appMarkerPosition)) {
          fieldLength = dataView.getUint16(appMarkerPosition + _APP_MARKER_SIZE, false);
        } else {
          break;
        }
        results.push(appMarkerPosition += _APP_MARKER_SIZE + fieldLength);
      }
      return results;
    };

    ExifReader.prototype._isApp1ExifMarker = function(dataView, appMarkerPosition) {
      return dataView.getUint16(appMarkerPosition, false) === _APP1_MARKER && dataView.getUint32(appMarkerPosition + _APP_ID_OFFSET, false) === _BYTES_Exif && dataView.getUint8(appMarkerPosition + _APP_ID_OFFSET + 4, false) === 0x00;
    };

    ExifReader.prototype._isAppMarker = function(dataView, appMarkerPosition) {
      var appMarker;
      appMarker = dataView.getUint16(appMarkerPosition, false);
      return appMarker >= _APP0_MARKER && appMarker <= _APP15_MARKER;
    };

    ExifReader.prototype._hasExifData = function() {
      return this._tiffHeaderOffset !== 0;
    };

    ExifReader.prototype._readTags = function() {
      this._setByteOrder();
      this._read0thIfd();
      this._readExifIfd();
      return this._readGpsIfd();
    };

    ExifReader.prototype._setByteOrder = function() {
      if (this._dataView.getUint16(this._tiffHeaderOffset) === _BYTE_ORDER_BIG_ENDIAN) {
        return this._littleEndian = true;
      } else if (this._dataView.getUint16(this._tiffHeaderOffset) === _BYTE_ORDER_LITTLE_ENDIAN) {
        return this._littleEndian = false;
      } else {
        throw new Error('Illegal byte order value. Faulty image.');
      }
    };

    ExifReader.prototype._read0thIfd = function() {
      var ifdOffset;
      ifdOffset = this._getIfdOffset();
      return this._readIfd('0th', ifdOffset);
    };

    ExifReader.prototype._getIfdOffset = function() {
      return this._tiffHeaderOffset + this._getLongAt(this._tiffHeaderOffset + 4);
    };

    ExifReader.prototype._readExifIfd = function() {
      var ifdOffset;
      if (this._tags['Exif IFD Pointer'] != null) {
        ifdOffset = this._tiffHeaderOffset + this._tags['Exif IFD Pointer'].value;
        return this._readIfd('exif', ifdOffset);
      }
    };

    ExifReader.prototype._readGpsIfd = function() {
      var ifdOffset;
      if (this._tags['GPS Info IFD Pointer'] != null) {
        ifdOffset = this._tiffHeaderOffset + this._tags['GPS Info IFD Pointer'].value;
        return this._readIfd('gps', ifdOffset);
      }
    };

    ExifReader.prototype._readIfd = function(ifdType, offset) {
      var fieldIndex, j, numberOfFields, ref, results, tag;
      numberOfFields = this._getShortAt(offset);
      offset += 2;
      results = [];
      for (fieldIndex = j = 0, ref = numberOfFields; 0 <= ref ? j < ref : j > ref; fieldIndex = 0 <= ref ? ++j : --j) {
        tag = this._readTag(ifdType, offset);
        if (tag !== void 0) {
          this._tags[tag.name] = {
            'value': tag.value,
            'description': tag.description
          };
        }
        results.push(offset += 12);
      }
      return results;
    };

    ExifReader.prototype._readTag = function(ifdType, offset) {
      var tagCode, tagCount, tagDescription, tagName, tagType, tagValue, tagValueOffset;
      tagCode = this._getShortAt(offset);
      if (this._tagNames[ifdType][tagCode] == null) {
        return void 0;
      }
      tagType = this._getShortAt(offset + 2);
      tagCount = this._getLongAt(offset + 4);
      if (this._typeSizes[tagType] === void 0) {
        return void 0;
      }
      if (this._typeSizes[tagType] * tagCount <= 4) {
        tagValue = this._getTagValue(offset + 8, tagType, tagCount);
      } else {
        tagValueOffset = this._getLongAt(offset + 8);
        tagValue = this._getTagValue(this._tiffHeaderOffset + tagValueOffset, tagType, tagCount);
      }
      if (tagType === this._tagTypes['ASCII']) {
        tagValue = this._splitNullSeparatedAsciiString(tagValue);
      }
      if (this._tagNames[ifdType][tagCode] != null) {
        if ((this._tagNames[ifdType][tagCode]['name'] != null) && (this._tagNames[ifdType][tagCode]['description'] != null)) {
          tagName = this._tagNames[ifdType][tagCode]['name'];
          tagDescription = this._tagNames[ifdType][tagCode]['description'](tagValue);
        } else {
          tagName = this._tagNames[ifdType][tagCode];
          if (tagValue instanceof Array) {
            tagDescription = tagValue.join(', ');
          } else {
            tagDescription = tagValue;
          }
        }
        return {
          'name': tagName,
          'value': tagValue,
          'description': tagDescription
        };
      } else {
        return {
          'name': "undefined-" + tagCode,
          'value': tagValue,
          'description': tagValue
        };
      }
    };

    ExifReader.prototype._getTagValue = function(offset, type, count) {
      var tagValue, value, valueIndex;
      value = (function() {
        var j, ref, results;
        results = [];
        for (valueIndex = j = 0, ref = count; 0 <= ref ? j < ref : j > ref; valueIndex = 0 <= ref ? ++j : --j) {
          tagValue = this[_getTagValueFunctionName[type]](offset);
          offset += this._typeSizes[type];
          results.push(tagValue);
        }
        return results;
      }).call(this);
      if (value.length === 1) {
        value = value[0];
      } else if (type === this._tagTypes['ASCII']) {
        value = this._getAsciiValue(value);
      }
      return value;
    };

    ExifReader.prototype._getAsciiValue = function(charArray) {
      var charCode, newCharArray;
      return newCharArray = (function() {
        var j, len, results;
        results = [];
        for (j = 0, len = charArray.length; j < len; j++) {
          charCode = charArray[j];
          results.push(String.fromCharCode(charCode));
        }
        return results;
      })();
    };

    ExifReader.prototype._getByteAt = function(offset) {
      return this._dataView.getUint8(offset);
    };

    ExifReader.prototype._getAsciiAt = function(offset) {
      return this._dataView.getUint8(offset);
    };

    ExifReader.prototype._getShortAt = function(offset) {
      return this._dataView.getUint16(offset, this._littleEndian);
    };

    ExifReader.prototype._getLongAt = function(offset) {
      return this._dataView.getUint32(offset, this._littleEndian);
    };

    ExifReader.prototype._getRationalAt = function(offset) {
      return this._getLongAt(offset) / this._getLongAt(offset + 4);
    };

    ExifReader.prototype._getUndefinedAt = function(offset) {
      return this._getByteAt(offset);
    };

    ExifReader.prototype._getSlongAt = function(offset) {
      return this._dataView.getInt32(offset, this._littleEndian);
    };

    ExifReader.prototype._getSrationalAt = function(offset) {
      return this._getSlongAt(offset) / this._getSlongAt(offset + 4);
    };

    ExifReader.prototype._splitNullSeparatedAsciiString = function(string) {
      var character, i, j, len, tagValue;
      tagValue = [];
      i = 0;
      for (j = 0, len = string.length; j < len; j++) {
        character = string[j];
        if (character === '\x00') {
          i++;
          continue;
        }
        if (tagValue[i] == null) {
          tagValue[i] = '';
        }
        tagValue[i] += character;
      }
      return tagValue;
    };

    ExifReader.prototype._typeSizes = {
      1: 1,
      2: 1,
      3: 2,
      4: 4,
      5: 8,
      7: 1,
      9: 4,
      10: 8
    };

    ExifReader.prototype._tagTypes = {
      'BYTE': 1,
      'ASCII': 2,
      'SHORT': 3,
      'LONG': 4,
      'RATIONAL': 5,
      'UNDEFINED': 7,
      'SLONG': 9,
      'SRATIONAL': 10
    };

    ExifReader.prototype._tagNames = {
      '0th': {
        0x0100: 'ImageWidth',
        0x0101: 'ImageLength',
        0x0112: {
          'name': 'Orientation',
          'description': function(value) {
            switch (value) {
              case 1:
                return 'top-left';
              case 2:
                return 'top-right';
              case 3:
                return 'bottom-right';
              case 4:
                return 'bottom-left';
              case 5:
                return 'left-top';
              case 6:
                return 'right-top';
              case 7:
                return 'right-bottom';
              case 8:
                return 'left-bottom';
              default:
                return 'Undefined';
            }
          }
        },
        0x8298: {
          'name': 'Copyright',
          'description': function(value) {
            return value.join('; ');
          }
        },
        0x8769: 'Exif IFD Pointer',
        0x8825: 'GPS Info IFD Pointer'
      },
      'exif': {
        0x9003: 'DateTimeOriginal',
        0xa002: 'PixelXDimension',
        0xa003: 'PixelYDimension'
      },
      'gps': {
        0x0001: {
          'name': 'GPSLatitudeRef',
          'description': function(value) {
            switch (value.join('')) {
              case 'N':
                return 'North latitude';
              case 'S':
                return 'South latitude';
              default:
                return 'Unknown';
            }
          }
        },
        0x0002: {
          'name': 'GPSLatitude',
          'description': function(value) {
            return value[0] + value[1] / 60 + value[2] / 3600;
          }
        },
        0x0003: {
          'name': 'GPSLongitudeRef',
          'description': function(value) {
            switch (value.join('')) {
              case 'E':
                return 'East longitude';
              case 'W':
                return 'West longitude';
              default:
                return 'Unknown';
            }
          }
        },
        0x0004: {
          'name': 'GPSLongitude',
          'description': function(value) {
            return value[0] + value[1] / 60 + value[2] / 3600;
          }
        }
      },
      'interoperability': {}
    };


    /*
     * Gets the image's value of the tag with the given name.
     *
     * name string The name of the tag to get the value of
     *
     * Returns the value of the tag with the given name if it exists,
     * otherwise throws "Undefined".
     */

    ExifReader.prototype.getTagValue = function(name) {
      if (this._tags[name] != null) {
        return this._tags[name].value;
      } else {
        return void 0;
      }
    };


    /*
     * Gets the image's description of the tag with the given name.
     *
     * name string The name of the tag to get the description of
     *
     * Returns the description of the tag with the given name if it exists,
     * otherwise throws "Undefined".
     */

    ExifReader.prototype.getTagDescription = function(name) {
      if (this._tags[name] != null) {
        return this._tags[name].description;
      } else {
        return void 0;
      }
    };


    /*
     * Gets all the image's tags.
     *
     * Returns the image's tags as an associative array: name -> description.
     */

    ExifReader.prototype.getAllTags = function() {
      return this._tags;
    };


    /*
     * Delete a tag.
     *
     * name string The name of the tag to delete
     *
     * Delete the tag with the given name. Can be used to lower memory usage.
     * E.g., the MakerNote tag can be really large.
     */

    ExifReader.prototype.deleteTag = function(name) {
      return delete this._tags[name];
    };

    return ExifReader;

  })();

}).call(this);
